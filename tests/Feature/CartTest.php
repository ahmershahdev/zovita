<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    public function test_adding_a_product_puts_it_in_the_bag(): void
    {
        $product = Product::factory()->create();

        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->get(route('cart.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Cart/Index')
                ->where('cart.count', 2)
                ->where('cart.lines.0.slug', $product->slug));
    }

    public function test_quantity_is_capped_by_stock_and_per_order_limit(): void
    {
        $product = Product::factory()->stock(3)->create(['max_per_order' => 10]);

        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 9]);

        $this->assertSame([$product->id => 3], session('cart.items'));
    }

    public function test_out_of_stock_products_cannot_be_added(): void
    {
        $product = Product::factory()->stock(0)->create();

        $this->post(route('cart.store'), ['product_id' => $product->id])->assertSessionHas('error');

        $this->assertEmpty(session('cart.items', []));
    }

    public function test_totals_use_sale_price_and_apply_delivery_fee_below_threshold(): void
    {
        config(['zovita.delivery_fee' => 150, 'zovita.free_delivery_over' => 2500]);
        $product = Product::factory()->onSale(400)->create(['price' => 500]);

        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);

        $this->get(route('cart.index'))->assertInertia(fn ($page) => $page
            ->where('cart.subtotal', 1000)
            ->where('cart.savings', 200)
            ->where('cart.delivery_fee', 150)
            ->where('cart.total', 950));
    }

    public function test_updating_to_zero_removes_the_line(): void
    {
        $product = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id]);

        $this->patch(route('cart.update', $product->slug), ['quantity' => 0])->assertRedirect();

        $this->assertEmpty(session('cart.items'));
    }
}
