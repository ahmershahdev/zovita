<?php

namespace Tests\Feature;

use App\Enums\StaffRole;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Security\PendingLogin;
use App\Services\Security\TwoFactor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class TwoFactorAndRolesTest extends TestCase
{
    use RefreshDatabase;

    private function twoFactor(): TwoFactor
    {
        return app(TwoFactor::class);
    }

    public function test_totp_matches_the_rfc_6238_test_vectors(): void
    {
        // RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (base32 below), last 6 of 8 digits.
        $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
        $this->assertSame('287082', $this->twoFactor()->code($secret, intdiv(59, 30)));
        $this->assertSame('081804', $this->twoFactor()->code($secret, intdiv(1111111109, 30)));
        $this->assertSame('050471', $this->twoFactor()->code($secret, intdiv(1111111111, 30)));
        $this->assertSame('005924', $this->twoFactor()->code($secret, intdiv(1234567890, 30)));
        $this->assertSame('279037', $this->twoFactor()->code($secret, intdiv(2000000000, 30)));
    }

    public function test_staff_without_two_step_must_set_it_up_before_any_session_starts(): void
    {
        $staff = User::factory()->create(['email' => 'new@zovita.com', 'password' => 'Secret@1234']);
        $staff->setStaffRole(StaffRole::Pharmacist);

        // Setup page is invisible until the staff password has just been entered.
        $this->get(route('admin.two-factor.setup'))->assertNotFound();

        $this->post(route('admin.login'), ['email' => 'new@zovita.com', 'password' => 'Secret@1234'])
            ->assertRedirect(route('admin.two-factor.setup'));
        $this->assertGuest();
        $this->get(route('admin.dashboard'))->assertNotFound();

        $page = $this->get(route('admin.two-factor.setup'))->assertOk();
        $secret = str_replace(' ', '', $page->viewData('page')['props']['secret']);
        $this->assertStringContainsString('<svg', $page->viewData('page')['props']['qr']);

        $this->post(route('admin.two-factor.setup.store'), ['code' => '000000'])->assertSessionHasErrors('code');
        $this->assertGuest();

        $this->post(route('admin.two-factor.setup.store'), ['code' => $this->twoFactor()->code($secret)])
            ->assertRedirect(route('admin.security'))
            ->assertSessionHas('recovery_codes', fn ($codes) => count($codes) === TwoFactor::RECOVERY_CODES);
        $this->assertAuthenticatedAs($staff);
        $this->assertTrue($staff->fresh()->hasTwoFactor());
        $this->get(route('admin.dashboard'))->assertOk();
    }

    public function test_a_code_cannot_be_replayed_and_five_wrong_codes_restart_sign_in(): void
    {
        $staff = $this->makeStaff(attributes: ['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $code = $this->totp($staff);

        $this->assertTrue($this->twoFactor()->verify($staff, $code));
        $this->assertFalse($this->twoFactor()->verify($staff, $code), 'the same code must not work twice');

        $this->post(route('admin.login'), ['email' => 'owner@zovita.com', 'password' => 'Secret@1234'])->assertRedirect(route('admin.two-factor.challenge'));
        for ($i = 1; $i < PendingLogin::MAX_ATTEMPTS; $i++) {
            $this->post(route('admin.two-factor.verify'), ['code' => '111111'])->assertSessionHasErrors('code');
        }
        $this->post(route('admin.two-factor.verify'), ['code' => '111111'])->assertRedirect(route('admin.login'));
        // The pending sign-in is gone: even a right code no longer helps without the password.
        $this->post(route('admin.two-factor.verify'), ['code' => '222222'])->assertNotFound();
        $this->assertGuest();
    }

    public function test_recovery_codes_work_exactly_once(): void
    {
        $staff = User::factory()->create(['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $staff->setStaffRole(StaffRole::Owner);
        $codes = $this->twoFactor()->enable($staff, $this->twoFactor()->generateSecret(), 1);

        $this->post(route('admin.login'), ['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $this->post(route('admin.two-factor.verify'), ['code' => strtolower($codes[0])])->assertRedirect(route('admin.dashboard'));
        $this->assertCount(TwoFactor::RECOVERY_CODES - 1, $staff->fresh()->two_factor_recovery_codes);
        $this->assertFalse($this->twoFactor()->verify($staff->fresh(), $codes[0]));
    }

    public function test_a_staff_session_without_the_second_step_is_refused(): void
    {
        // e.g. a remember-me cookie or a session from before two-step sign-in existed.
        $staff = $this->makeStaff();
        $this->actingAs($staff)->get(route('admin.dashboard'))->assertRedirect(route('admin.login'));
        $this->assertGuest();
    }

    public function test_customers_can_turn_on_optional_two_step_sign_in(): void
    {
        $customer = User::factory()->create(['email' => 'ayesha@example.com', 'password' => 'secret-pass-123']);
        $this->actingAs($customer->fresh())->post(route('account.two-factor.start'))->assertSessionHas('tab', 'security');
        $props = $this->get(route('account.dashboard'))->viewData('page')['props']['twoFactor'];
        $this->assertFalse($props['enabled']);
        $secret = str_replace(' ', '', $props['setup']['secret']);

        $this->post(route('account.two-factor.confirm'), ['code' => $this->twoFactor()->code($secret)])->assertSessionHas('recovery_codes');
        $this->assertTrue($customer->fresh()->hasTwoFactor());

        // Next sign-in needs the code too.
        $this->post(route('logout'));
        $this->post(route('login'), ['email' => 'ayesha@example.com', 'password' => 'secret-pass-123'])->assertRedirect(route('two-factor.challenge'));
        $this->assertGuest();
        $this->travel(31)->seconds(); // a fresh time-step, so the code isn't a replay of the set-up code
        $this->post(route('two-factor.verify'), ['code' => $this->totp($customer)])->assertRedirect(route('account.dashboard'));
        $this->assertAuthenticatedAs($customer);

        // Turning it off needs the password.
        $this->delete(route('account.two-factor.destroy'), ['password' => 'wrong'])->assertSessionHasErrors('password');
        $this->delete(route('account.two-factor.destroy'), ['password' => 'secret-pass-123'])->assertSessionHas('success');
        $this->assertFalse($customer->fresh()->hasTwoFactor());
    }

    public function test_customers_without_two_step_sign_in_as_before(): void
    {
        User::factory()->create(['email' => 'plain@example.com', 'password' => 'secret-pass-123']);
        $this->post(route('login'), ['email' => 'plain@example.com', 'password' => 'secret-pass-123'])->assertRedirect(route('account.dashboard'));
        $this->assertAuthenticated();
    }

    public function test_each_role_only_reaches_what_it_is_allowed(): void
    {
        $customer = User::factory()->create();
        $prescription = Prescription::create([
            'reference' => Prescription::generateReference(), 'name' => 'A', 'email' => 'a@example.com', 'phone' => '03001234567',
            'file_path' => 'prescriptions/x.png', 'original_name' => 'x.png', 'status' => 'received',
        ]);

        $pharmacist = $this->makeStaff(StaffRole::Pharmacist);
        $this->actingAsStaff($pharmacist);
        $this->get(route('admin.prescriptions.index'))->assertOk();
        $this->get(route('admin.products.index'))->assertOk();
        $this->get(route('admin.orders.index'))->assertOk();
        $this->get(route('admin.users.index'))->assertForbidden();
        $this->post(route('admin.users.ban', $customer), ['severity' => 'permanent', 'reason' => 'x'])->assertForbidden();
        $this->get(route('admin.staff.index'))->assertForbidden();

        $support = $this->makeStaff(StaffRole::Support);
        $this->actingAsStaff($support);
        $this->get(route('admin.users.index'))->assertOk();
        $this->patch(route('admin.users.username', $customer), ['username' => 'calm-heron-1234'])->assertSessionHas('success');
        $this->get(route('admin.prescriptions.index'))->assertForbidden();
        $this->patch(route('admin.prescriptions.update', $prescription), ['status' => 'approved'])->assertForbidden();
        $this->post(route('admin.users.ban', $customer), ['severity' => 'permanent', 'reason' => 'x'])->assertForbidden();
        $order = Order::create(['number' => 'ZV-T-R', 'status' => 'pending', 'customer_name' => 'A', 'email' => 'a@example.com', 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);
        $this->post(route('admin.orders.refund', $order), ['amount' => 10])->assertForbidden();

        // The sidebar gets only what the role can open.
        $props = $this->get(route('admin.dashboard'))->viewData('page')['props'];
        $this->assertSame(StaffRole::Support->permissions(), $props['auth']['user']['permissions']);
    }

    public function test_owners_manage_staff_and_the_last_owner_cannot_be_removed(): void
    {
        $owner = $this->makeStaff(StaffRole::Owner);
        $customer = User::factory()->create(['email' => 'new.pharmacist@example.com']);
        $this->actingAsStaff($owner);

        $this->post(route('admin.staff.store'), ['email' => 'new.pharmacist@example.com', 'role' => 'pharmacist'])->assertSessionHas('success');
        $this->assertSame(StaffRole::Pharmacist, $customer->fresh()->staffRole());
        $this->assertTrue($customer->fresh()->isAdmin());

        $this->post(route('admin.staff.store'), ['email' => 'nobody@example.com', 'role' => 'support'])->assertSessionHasErrors('email');

        $this->patch(route('admin.staff.update', $customer), ['role' => 'support'])->assertSessionHas('success');
        $this->assertSame(StaffRole::Support, $customer->fresh()->staffRole());

        // Only one owner: they can't demote or remove themselves.
        $this->patch(route('admin.staff.update', $owner), ['role' => 'support'])->assertSessionHas('error');
        $this->delete(route('admin.staff.destroy', $owner))->assertSessionHas('error');
        $this->assertSame(StaffRole::Owner, $owner->fresh()->staffRole());

        $this->delete(route('admin.staff.destroy', $customer))->assertSessionHas('success');
        $this->assertNull($customer->fresh()->staffRole());
        $this->assertFalse($customer->fresh()->isAdmin());
    }

    public function test_owner_can_reset_a_lost_phone(): void
    {
        $owner = $this->makeStaff(StaffRole::Owner);
        $pharmacist = $this->makeStaff(StaffRole::Pharmacist);
        $this->actingAsStaff($owner)->post(route('admin.staff.reset-2fa', $pharmacist))->assertSessionHas('success');
        $this->assertFalse($pharmacist->fresh()->hasTwoFactor());
    }

    public function test_the_user_admin_command_sets_roles(): void
    {
        $user = User::factory()->create(['email' => 'cli@example.com']);
        Artisan::call('user:admin', ['email' => 'cli@example.com', '--role' => 'pharmacist']);
        $this->assertSame(StaffRole::Pharmacist, $user->fresh()->staffRole());
        Artisan::call('user:admin', ['email' => 'cli@example.com', '--revoke' => true]);
        $this->assertFalse($user->fresh()->isAdmin());
        $this->assertSame(1, Artisan::call('user:admin', ['email' => 'cli@example.com', '--role' => 'janitor']));
    }
}
