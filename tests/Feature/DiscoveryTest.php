<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Body map, sold-out alternatives and security headers. */
class DiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_body_map_page_lists_regions_and_symptoms(): void
    {
        $this->get(route('body-map'))->assertInertia(fn ($page) => $page
            ->component('BodyMap/Show')
            ->has('regions', 10)
            ->where('regions.0.key', 'head'));
    }

    public function test_body_map_recommends_in_stock_products_for_a_symptom(): void
    {
        $sold = Product::factory()->create(['name' => 'Sold Out Relief', 'stock' => 0]);
        $inStock = Product::factory()->create(['name' => 'Panadol Tablets']);

        $this->getJson(route('body-map.recommend', 'headache'))
            ->assertOk()
            ->assertJsonPath('symptom.label', 'Headache')
            ->assertJsonPath('products.0.id', $inStock->id)
            ->assertJsonPath('products.1.id', $sold->id);
    }

    public function test_urgent_symptoms_return_guidance_instead_of_products(): void
    {
        Product::factory()->create();

        $this->getJson(route('body-map.recommend', 'chest-pain'))
            ->assertOk()
            ->assertJsonPath('symptom.urgent', true)
            ->assertJsonCount(0, 'products');
    }

    public function test_unknown_symptom_is_404(): void
    {
        $this->getJson('/body-map/recommend/not-a-symptom')->assertNotFound();
        $this->getJson('/body-map/recommend/..%2F..%2Fetc%2Fpasswd')->assertNotFound();
    }

    public function test_sold_out_product_offers_same_generic_alternatives_first(): void
    {
        $product = Product::factory()->create(['stock' => 0, 'generics' => 'Paracetamol']);
        $sameSalt = Product::factory()->create(['generics' => 'Paracetamol', 'price' => 900]);
        Product::factory()->create(['generics' => 'Ibuprofen', 'price' => 500]);
        Product::factory()->create(['generics' => 'Paracetamol', 'stock' => 0]);

        $this->get(route('products.show', $product))->assertInertia(fn ($page) => $page
            ->where('alternatives.0.id', $sameSalt->id)
            ->where('alternatives.0.same_generic', true)
            ->has('alternatives', 2));
    }

    public function test_in_stock_product_only_lists_same_salt_alternatives(): void
    {
        $product = Product::factory()->create(['generics' => 'Paracetamol']);
        Product::factory()->create(['generics' => 'Ibuprofen']);

        $this->get(route('products.show', $product))->assertInertia(fn ($page) => $page->has('alternatives', 0));
    }

    public function test_bag_suggests_substitutes_for_items_that_sold_out(): void
    {
        $product = Product::factory()->create(['stock' => 5]);
        $substitute = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $product->update(['stock' => 0]);

        $this->get(route('cart.index'))->assertInertia(fn ($page) => $page
            ->where("alternatives.{$product->id}.0.id", $substitute->id));
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get(route('home'))
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin')
            ->assertHeaderMissing('X-Powered-By');
    }
}
