<?php

namespace Tests\Feature;

use App\Models\Offer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Models\User;
use App\Services\Personalization\OfferEngine;
use App\Services\Personalization\Pricing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PersonalizationTest extends TestCase
{
    use RefreshDatabase;

    private function checkout(array $overrides = []): TestResponse
    {
        return $this->post(route('checkout.store'), $overrides + [
            'name' => 'Ayesha Khan',
            'email' => 'ayesha@example.com',
            'phone' => '03001234567',
            'address' => 'House 12, Street 4, Clifton Block 5',
            'city' => 'Karachi',
            'checkout_token' => (string) Str::uuid(),
        ]);
    }

    public function test_viewing_a_product_records_interest_and_dwell(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->get(route('products.show', $product))->assertOk();
        $this->postJson(route('signals.dwell'), ['product_id' => $product->id, 'seconds' => 30])->assertOk();

        $row = ProductInteraction::where('visitor', 'u:'.$user->id)->where('product_id', $product->id)->first();
        $this->assertSame(1, $row->views);
        $this->assertSame(30, $row->dwell_seconds);
    }

    public function test_hesitating_on_a_product_unlocks_a_personal_discount(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 1000]);
        ProductInteraction::create(['visitor' => 'u:'.$user->id, 'user_id' => $user->id, 'product_id' => $product->id, 'views' => 4, 'dwell_seconds' => 90, 'last_seen_at' => now()]);

        $this->actingAs($user);
        app(OfferEngine::class)->evaluate(force: true);

        $offer = Offer::where('visitor', 'u:'.$user->id)->where('product_id', $product->id)->first();
        $this->assertSame('hesitation', $offer->kind);
        $this->assertSame(8, $offer->percent);

        $this->get(route('products.show', $product))
            ->assertInertia(fn ($page) => $page->where('personalOffer.percent', 8));
    }

    public function test_repeat_purchases_earn_a_regular_discount(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        ProductInteraction::create(['visitor' => 'u:'.$user->id, 'user_id' => $user->id, 'product_id' => $product->id, 'purchases' => 3, 'last_seen_at' => now()]);

        $this->actingAs($user);
        app(OfferEngine::class)->evaluate(force: true);

        $this->assertDatabaseHas('offers', ['product_id' => $product->id, 'kind' => 'regular', 'percent' => 10]);
    }

    public function test_new_customers_get_a_welcome_offer_and_loyal_ones_a_loyalty_offer(): void
    {
        $new = User::factory()->create();
        $this->actingAs($new);
        app(OfferEngine::class)->evaluate(force: true);
        $this->assertDatabaseHas('offers', ['user_id' => $new->id, 'kind' => 'welcome', 'product_id' => null]);

        $loyal = User::factory()->create();
        Order::unguarded(fn () => collect(range(1, 3))->each(fn ($i) => Order::create([
            'user_id' => $loyal->id, 'number' => "ZV-T-{$i}", 'status' => 'delivered', 'customer_name' => 'L', 'email' => 'l@example.com',
            'phone' => '1', 'address' => 'a', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100,
        ])));
        $this->actingAs($loyal);
        app(OfferEngine::class)->evaluate(force: true);
        $this->assertDatabaseHas('offers', ['user_id' => $loyal->id, 'kind' => 'loyalty', 'percent' => 5]);
    }

    public function test_checkout_charges_the_offer_price_and_redeems_it_once(): void
    {
        Mail::fake();
        // An established customer, so no welcome offer stacks on top.
        $user = User::factory()->create(['created_at' => now()->subDays(90)]);
        $product = Product::factory()->create(['price' => 1000, 'stock' => 10]);
        $offer = Offer::create(['visitor' => 'u:'.$user->id, 'user_id' => $user->id, 'product_id' => $product->id, 'kind' => 'hesitation', 'percent' => 8, 'reason' => 'test', 'expires_at' => now()->addDay()]);

        $this->actingAs($user)->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $this->get(route('cart.index'))->assertInertia(fn ($page) => $page->where('cart.offer_discount', 160)->where('cart.total', 1990));

        $this->checkout()->assertRedirect();

        $order = Order::latest('id')->first();
        $this->assertEquals(160, $order->offer_discount);
        $this->assertEquals(1990, $order->total); // 2000 − 160 offer + 150 delivery
        $this->assertNotNull($offer->fresh()->redeemed_at);
        $this->assertSame($order->id, $offer->fresh()->order_id);
        $this->assertSame(1, (int) ProductInteraction::where('visitor', 'u:'.$user->id)->value('purchases'));
    }

    public function test_stacked_offers_are_capped(): void
    {
        $product = Product::factory()->make(['id' => 1, 'price' => 1000, 'sale_price' => null]);
        $offers = collect([
            new Offer(['product_id' => 1, 'percent' => 10]),
            new Offer(['product_id' => null, 'percent' => 10]),
        ])->each(fn ($o, $i) => $o->id = $i + 1);

        $result = Pricing::apply([['product' => $product, 'quantity' => 1]], $offers);

        // 10% then 10% of the rest = 190, capped at 15% = 150.
        $this->assertEquals(150, $result['discount']);
    }

    public function test_guest_history_follows_the_customer_into_their_account(): void
    {
        $product = Product::factory()->create();
        $user = User::factory()->create(['password' => 'secret-password']);
        $guest = (string) Str::uuid();

        $this->withCookie('zv_vid', $guest)->get(route('products.show', $product));
        $this->assertDatabaseHas('product_interactions', ['visitor' => 'g:'.$guest, 'product_id' => $product->id]);

        $this->withCookie('zv_vid', $guest)->post(route('login'), ['email' => $user->email, 'password' => 'secret-password']);

        $this->assertDatabaseHas('product_interactions', ['visitor' => 'u:'.$user->id, 'product_id' => $product->id, 'views' => 1]);
        $this->assertDatabaseMissing('product_interactions', ['visitor' => 'g:'.$guest]);
    }
}
