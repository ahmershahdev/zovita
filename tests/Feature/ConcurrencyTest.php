<?php

namespace Tests\Feature;

use App\Actions\Orders\PlaceOrder;
use App\Models\Order;
use App\Models\Product;
use App\Services\Cart\CartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/** "One unit left, two buyers" and other races around checkout. */
class ConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private function details(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Ayesha Khan',
            'email' => 'ayesha@example.com',
            'phone' => '03001234567',
            'address' => 'House 12, Street 4, Clifton Block 5',
            'city' => 'Karachi',
        ];
    }

    public function test_last_unit_goes_to_exactly_one_of_two_buyers(): void
    {
        Mail::fake();
        $product = Product::factory()->create(['stock' => 1]);

        // Buyer A and buyer B both manage to put the last unit in their bags.
        $this->post(route('cart.store'), ['product_id' => $product->id]);
        $sessionA = session()->all();
        $this->flushSession();
        $this->post(route('cart.store'), ['product_id' => $product->id]);
        $sessionB = session()->all();

        $this->flushSession();
        $this->withSession($sessionA)->post(route('checkout.store'), $this->details())->assertRedirect();

        $this->flushSession();
        $this->withSession($sessionB)->post(route('checkout.store'), $this->details(['email' => 'bilal@example.com']))
            ->assertSessionHasErrors('cart');

        $this->assertSame(1, Order::count());
        $this->assertSame(0, $product->fresh()->stock);
    }

    public function test_double_submitted_checkout_creates_one_order(): void
    {
        Mail::fake();
        $product = Product::factory()->create(['stock' => 10]);
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $token = (string) Str::uuid();

        $first = $this->post(route('checkout.store'), $this->details(['checkout_token' => $token]));
        // Retry with the same token (double-click / network retry) after the bag was already cleared.
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $second = $this->post(route('checkout.store'), $this->details(['checkout_token' => $token]));

        $this->assertSame(1, Order::count());
        $this->assertSame($first->headers->get('Location'), $second->headers->get('Location'));
        $this->assertSame(8, $product->fresh()->stock);
    }

    public function test_conditional_decrement_never_oversells(): void
    {
        Mail::fake();
        $product = Product::factory()->create(['stock' => 3]);
        app(CartService::class)->set($product, 3);

        // Another buyer takes a unit after this customer filled their bag.
        Product::whereKey($product->id)->update(['stock' => 2]);

        $this->expectException(ValidationException::class);
        try {
            app(PlaceOrder::class)->handle($this->details(), null);
        } finally {
            $this->assertSame(2, $product->fresh()->stock);
            $this->assertSame(0, Order::count());
        }
    }
}
