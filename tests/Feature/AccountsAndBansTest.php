<?php

namespace Tests\Feature;

use App\Models\Ban;
use App\Models\User;
use App\Services\Security\BanGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AccountsAndBansTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        $user = $this->makeStaff(attributes: ['email' => 'admin@zovita.com', 'password' => 'Admin@1234']);

        return $user->fresh();
    }

    private function register(array $overrides = []): TestResponse
    {
        return $this->post(route('register'), $overrides + [
            'name' => 'Repeat Offender',
            'email' => 'offender@example.com',
            'password' => 'secret-pass-123',
            'password_confirmation' => 'secret-pass-123',
            'terms' => true,
        ]);
    }

    // ── Admin access ─────────────────────────────────────────────────────

    public function test_staff_sign_in_works_only_on_the_staff_form(): void
    {
        $this->staff();

        // The customer form refuses staff accounts with the generic message.
        $this->post(route('login'), ['email' => 'admin@zovita.com', 'password' => 'Admin@1234'])->assertSessionHasErrors('email');
        $this->assertGuest();

        // The right password alone isn't enough: the two-step code comes next.
        $this->post(route('admin.login'), ['email' => 'admin@zovita.com', 'password' => 'Admin@1234'])->assertRedirect(route('admin.two-factor.challenge'));
        $this->get(route('admin.dashboard'))->assertNotFound();
        $staff = User::where('email', 'admin@zovita.com')->first();
        $this->post(route('admin.two-factor.verify'), ['code' => $this->totp($staff)])->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticated();
        $this->get(route('admin.dashboard'))->assertOk();
    }

    public function test_customers_cannot_use_the_staff_form(): void
    {
        $customer = User::factory()->create(['password' => 'secret-pass-123']);
        $this->post(route('admin.login'), ['email' => $customer->email, 'password' => 'secret-pass-123'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_staff_sessions_expire_when_idle(): void
    {
        $this->actingAsStaff($this->staff())->withSession(['admin_last_active' => now()->subHour()->timestamp]);
        $this->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
        $this->assertGuest();
    }

    public function test_the_store_never_links_to_the_admin(): void
    {
        $this->actingAsStaff($this->staff());
        $this->assertStringNotContainsString('/admin', $this->get(route('home'))->getContent());
    }

    // ── Bans ─────────────────────────────────────────────────────────────

    public function test_temporary_ban_locks_the_account_until_it_expires(): void
    {
        $customer = User::factory()->create(['password' => 'secret-pass-123']);
        $this->actingAsStaff($this->staff())->post(route('admin.users.ban', $customer), ['severity' => 'temporary', 'duration' => '1d', 'reason' => 'Cooling off'])->assertSessionHas('success');
        auth()->logout();

        $this->post(route('login'), ['email' => $customer->email, 'password' => 'secret-pass-123'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->travel(2)->days();
        $this->post(route('login'), ['email' => $customer->email, 'password' => 'secret-pass-123'])->assertRedirect();
        $this->assertAuthenticatedAs($customer);
    }

    public function test_permanent_ban_blocks_new_accounts_with_the_same_email_or_gmail_alias(): void
    {
        $customer = User::factory()->create(['email' => 'repeat.offender@gmail.com']);
        app(BanGuard::class)->ban($customer, 'permanent', 'Fake orders', null, null, null);

        $this->register(['email' => 'repeatoffender+new@gmail.com'])->assertSessionHasErrors('email');
        $this->register(['email' => 'Repeat.Offender@googlemail.com'])->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);

        // An unrelated person can still sign up.
        $this->register(['email' => 'someone.else@example.com'])->assertSessionHasNoErrors();
    }

    public function test_deep_ban_blocks_the_network_from_the_whole_site(): void
    {
        $customer = User::factory()->create();
        $customer->forceFill(['last_login_ip' => '203.0.113.7'])->save();
        app(BanGuard::class)->ban($customer->fresh(), 'deep', 'Forged prescriptions', null, null, null);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.99'])->get(route('shop.index'))->assertStatus(403)
            ->assertInertia(fn ($page) => $page->component('Auth/Suspended'));
        // Other networks are unaffected, and policies stay readable for the blocked one.
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.4'])->get(route('shop.index'))->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.99'])->get(route('legal', 'terms'))->assertOk();
    }

    public function test_ip_matches_only_count_for_deep_bans(): void
    {
        $customer = User::factory()->create();
        $customer->forceFill(['last_login_ip' => '203.0.113.7'])->save();
        app(BanGuard::class)->ban($customer->fresh(), 'permanent', 'Abuse', null, null, null);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])->get(route('shop.index'))->assertOk();
    }

    public function test_lifting_a_ban_restores_access(): void
    {
        $customer = User::factory()->create(['password' => 'secret-pass-123']);
        $staff = $this->staff();
        $this->actingAsStaff($staff)->post(route('admin.users.ban', $customer), ['severity' => 'permanent', 'reason' => 'Mistake']);
        $this->delete(route('admin.users.unban', $customer))->assertSessionHas('success');

        $this->assertFalse($customer->fresh()->isBanned());
        $this->assertSame(0, Ban::active()->count());
    }

    public function test_banned_customers_appear_with_activity_in_the_admin(): void
    {
        $customer = User::factory()->create();
        $this->actingAsStaff($this->staff())->post(route('admin.users.ban', $customer), ['severity' => 'temporary', 'duration' => '1w', 'reason' => 'Rude']);

        $this->get(route('admin.users.show', $customer))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/User')
            ->where('customer.banned', true)
            ->where('activity.data.0.type', 'ban.issued'));
    }

    // ── Usernames & profile ──────────────────────────────────────────────

    public function test_every_account_gets_a_username_customers_cannot_change(): void
    {
        $customer = User::factory()->create();
        $this->assertMatchesRegularExpression('/^[a-z]+-[a-z]+-\d{4}$/', $customer->username);
        $original = $customer->username;

        $this->actingAs($customer)->put(route('account.profile.update'), ['name' => 'New Name', 'email' => $customer->email, 'username' => 'hacker'])->assertSessionHasNoErrors();
        $this->assertSame($original, $customer->fresh()->username);
    }

    public function test_staff_can_change_a_username(): void
    {
        $customer = User::factory()->create();
        $this->actingAsStaff($this->staff())->patch(route('admin.users.username', $customer), ['username' => 'ayesha-k'])->assertSessionHas('success');
        $this->assertSame('ayesha-k', $customer->fresh()->username);
        $this->patch(route('admin.users.username', $customer), ['username' => 'Bad Name!'])->assertSessionHasErrors('username');
    }

    public function test_changing_email_requires_the_current_password(): void
    {
        $customer = User::factory()->create(['password' => 'secret-pass-123']);
        $this->actingAs($customer)->put(route('account.profile.update'), ['name' => $customer->name, 'email' => 'new@example.com'])->assertSessionHasErrors('current_password');
        $this->put(route('account.profile.update'), ['name' => $customer->name, 'email' => 'new@example.com', 'current_password' => 'secret-pass-123', 'lat' => 24.81, 'lng' => 67.03])->assertSessionHasNoErrors();

        $fresh = $customer->fresh();
        $this->assertSame('new@example.com', $fresh->email);
        $this->assertEquals(24.81, $fresh->lat);
    }

    public function test_profile_picture_upload_is_resized_to_webp(): void
    {
        Storage::fake('public');
        $customer = User::factory()->create();

        $this->actingAs($customer)->post(route('account.avatar.update'), ['avatar' => UploadedFile::fake()->image('me.jpg', 900, 600)])->assertSessionHas('success');

        $path = $customer->fresh()->avatar_path;
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);
        [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertSame([320, 320], [$w, $h]);
    }
}
