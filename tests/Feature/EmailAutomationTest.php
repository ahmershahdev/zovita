<?php

namespace Tests\Feature;

use App\Enums\StaffRole;
use App\Mail\NoticeMail;
use App\Models\Order;
use App\Models\User;
use App\Services\Security\LoginCodes;
use App\Services\Security\TwoFactor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/** E-mailed sign-in codes, e-mail confirmation, password reset expiry and automatic notices. */
class EmailAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function lastCode(): string
    {
        $mail = Mail::sent(NoticeMail::class, fn ($m) => $m->code !== null)->last();
        $this->assertNotNull($mail, 'a sign-in code e-mail was sent');

        return $mail->code;
    }

    private function staff(array $attributes = []): User
    {
        $user = User::factory()->create($attributes + ['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $user->setStaffRole(StaffRole::Owner);

        return $user->fresh();
    }

    public function test_staff_without_an_app_sign_in_with_an_emailed_code(): void
    {
        $staff = $this->staff();
        $this->post(route('admin.login'), ['email' => 'owner@zovita.com', 'password' => 'Secret@1234'])->assertRedirect(route('admin.two-factor.challenge'));
        $this->assertGuest();
        $this->get(route('admin.dashboard'))->assertNotFound(); // password alone opens nothing

        $props = $this->get(route('admin.two-factor.challenge'))->assertOk()->viewData('page')['props'];
        $this->assertSame('email', $props['method']);
        $this->assertStringStartsWith('o', $props['email']);
        $this->assertStringNotContainsString('owner@', $props['email']); // masked

        $code = $this->lastCode();
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertDatabaseMissing('login_codes', ['code_hash' => $code]); // stored hashed only

        $this->post(route('admin.two-factor.verify'), ['code' => $code === '000000' ? '111111' : '000000'])->assertSessionHasErrors('code');
        $this->post(route('admin.two-factor.verify'), ['code' => $code])->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($staff);
        $this->get(route('admin.dashboard'))->assertOk();
    }

    public function test_emailed_codes_expire_after_ten_minutes_and_work_once(): void
    {
        $staff = $this->staff();
        $this->post(route('admin.login'), ['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $code = $this->lastCode();

        $this->travel(11)->minutes();
        $this->post(route('admin.two-factor.verify'), ['code' => $code])->assertNotFound(); // pending sign-in expired too
        $this->assertFalse(app(LoginCodes::class)->verify($staff, $code));
    }

    public function test_a_code_is_single_use_and_resend_replaces_it(): void
    {
        $staff = $this->staff();
        $codes = app(LoginCodes::class);
        $codes->send($staff);
        $first = $this->lastCode();
        $this->assertFalse($codes->send($staff), 'throttled to one per minute');

        $this->travel(61)->seconds();
        $this->assertTrue($codes->send($staff));
        $second = $this->lastCode();
        $this->assertFalse($first !== $second && $codes->verify($staff, $first), 'the old code is cancelled');
        $this->assertTrue($codes->verify($staff, $second));
        $this->assertFalse($codes->verify($staff, $second), 'and works only once');
    }

    public function test_staff_can_switch_to_an_authenticator_app_from_their_panel(): void
    {
        $staff = $this->staff();
        $this->actingAsStaff($staff)->post(route('admin.security.authenticator.start'));
        $secret = str_replace(' ', '', $this->get(route('admin.security'))->viewData('page')['props']['twoFactor']['setup']['secret']);
        $this->post(route('admin.security.authenticator.confirm'), ['code' => app(TwoFactor::class)->code($secret)])->assertSessionHas('recovery_codes');
        $this->assertTrue($staff->fresh()->hasTwoFactor());

        // Next sign-in asks for the app's code, not an e-mail.
        $this->post(route('admin.logout'));
        Mail::fake();
        $this->post(route('admin.login'), ['email' => 'owner@zovita.com', 'password' => 'Secret@1234']);
        $this->assertSame('totp', $this->get(route('admin.two-factor.challenge'))->viewData('page')['props']['method']);
        Mail::assertNotSent(NoticeMail::class, fn ($m) => $m->code !== null);
    }

    public function test_customers_can_sign_in_with_an_emailed_code_without_revealing_accounts(): void
    {
        $customer = User::factory()->create(['email' => 'ayesha@example.com']);
        $this->post(route('login.code.send'), ['email' => 'ayesha@example.com'])->assertRedirect(route('two-factor.challenge'));
        $this->post(route('two-factor.verify'), ['code' => $this->lastCode()])->assertRedirect(route('account.dashboard'));
        $this->assertAuthenticatedAs($customer);

        // An address with no account looks exactly the same, and nothing is sent.
        $this->post(route('logout'));
        Mail::fake();
        $this->post(route('login.code.send'), ['email' => 'nobody@example.com'])->assertRedirect(route('two-factor.challenge'));
        $this->get(route('two-factor.challenge'))->assertOk();
        $this->post(route('two-factor.verify'), ['code' => '123456'])->assertSessionHasErrors('code');
        Mail::assertNothingSent();
        $this->assertGuest();
    }

    public function test_signup_sends_a_confirmation_link_that_expires_in_ten_minutes(): void
    {
        $user = User::factory()->unverified()->create();
        $user->sendEmailVerificationNotification();
        $link = Mail::sent(NoticeMail::class, fn ($m) => $m->buttonLabel === 'Confirm my e-mail')->last()->buttonUrl;

        $this->travel(11)->minutes();
        $this->get($link)->assertForbidden();
        $this->assertFalse($user->fresh()->hasVerifiedEmail());

        $this->travelBack();
        $user->sendEmailVerificationNotification();
        $fresh = Mail::sent(NoticeMail::class, fn ($m) => $m->buttonLabel === 'Confirm my e-mail')->last()->buttonUrl;
        $this->get($fresh)->assertRedirect();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_password_reset_links_are_random_and_expire_in_ten_minutes(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);
        $this->assertSame(64, strlen($token));
        $this->assertNotSame($token, Password::broker()->createToken($user));
        $this->assertSame(10, config('auth.passwords.users.expire'));

        $token = Password::broker()->createToken($user);
        $this->travel(11)->minutes();
        $this->assertFalse(Password::broker()->tokenExists($user, $token));
        $this->assertNotSame($token, DB::table('password_reset_tokens')->value('token')); // stored hashed
    }

    public function test_a_sign_in_from_a_new_place_sends_an_alert(): void
    {
        $user = User::factory()->create(['email' => 'alert@example.com', 'password' => 'secret-pass-123']);
        DB::table('user_activities')->insert(['user_id' => $user->id, 'type' => 'auth.login', 'description' => 'Signed in', 'ip' => '10.9.9.9', 'created_at' => now()->subDays(3)]);

        $this->post(route('login'), ['email' => 'alert@example.com', 'password' => 'secret-pass-123']);
        Mail::assertSent(NoticeMail::class, fn ($m) => $m->title === 'New sign-in to your Zovita account' && $m->hasTo('alert@example.com'));

        // Same place again: no alert.
        $this->post(route('logout'));
        Mail::fake();
        $this->travel(10)->seconds();
        $this->post(route('login'), ['email' => 'alert@example.com', 'password' => 'secret-pass-123']);
        Mail::assertNotSent(NoticeMail::class, fn ($m) => $m->title === 'New sign-in to your Zovita account');
    }

    public function test_customers_get_an_email_when_their_order_status_changes(): void
    {
        $order = Order::create(['number' => 'ZV-T-M', 'status' => 'pending', 'customer_name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);
        $this->actingAsStaff($this->makeStaff(StaffRole::Pharmacist))->patch(route('admin.orders.update', $order), ['status' => 'shipped']);
        Mail::assertSent(NoticeMail::class, fn ($m) => $m->hasTo('ayesha@example.com') && str_contains($m->title, 'Out for delivery'));
    }
}
