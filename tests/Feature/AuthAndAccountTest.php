<?php

namespace Tests\Feature;

use App\Mail\WelcomeMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthAndAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_account_signs_in_and_sends_welcome_email(): void
    {
        Mail::fake();

        $this->post(route('register'), [
            'name' => 'Bilal Ahmed',
            'email' => 'Bilal@Example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'terms' => true,
        ])->assertRedirect(route('account.dashboard'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'bilal@example.com']);
        Mail::assertSent(WelcomeMail::class);
    }

    public function test_login_and_logout(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post(route('login'), ['email' => $user->email, 'password' => 'secret123'])->assertRedirect(route('account.dashboard'));
        $this->assertAuthenticatedAs($user);

        $this->post(route('logout'))->assertRedirect(route('home'));
        $this->assertGuest();
    }

    public function test_password_reset_link_response_does_not_reveal_whether_account_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->post(route('password.email'), ['email' => $user->email]);
        $unknown = $this->post(route('password.email'), ['email' => 'nobody@example.com']);

        $this->assertSame($known->getSession()->get('success'), $unknown->getSession()->get('success'));
        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_account_requires_login_and_hides_other_customers_orders(): void
    {
        $this->get(route('account.dashboard'))->assertRedirect(route('login'));

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $order = Order::create([
            'user_id' => $owner->id, 'number' => 'ZV-TEST-1', 'customer_name' => 'Owner', 'email' => $owner->email,
            'phone' => '03001234567', 'address' => 'Somewhere 123', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 250,
        ]);

        $this->actingAs($other)->get(route('account.orders.show', $order))->assertNotFound();
        $this->actingAs($owner)->get(route('account.orders.show', $order))->assertOk();
    }

    public function test_guest_wishlist_is_merged_into_account_on_login(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create(['password' => 'secret123']);

        $this->post(route('wishlist.toggle', $product->slug));
        $this->post(route('login'), ['email' => $user->email, 'password' => 'secret123']);

        $this->assertTrue($user->wishlist()->whereKey($product->id)->exists());
    }
}
