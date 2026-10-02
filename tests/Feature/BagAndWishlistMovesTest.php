<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BagAndWishlistMovesTest extends TestCase
{
    use RefreshDatabase;

    public function test_wishlist_item_moves_to_the_bag(): void
    {
        $product = Product::factory()->create();
        $this->post(route('wishlist.toggle', $product));

        $this->post(route('wishlist.move', $product))->assertRedirect()->assertSessionHas('success');

        $this->assertSame([$product->id => 1], session('cart.items'));
        $this->get(route('wishlist.index'))->assertInertia(fn ($page) => $page->where('wishlist', []));
    }

    public function test_sold_out_wishlist_item_stays_saved(): void
    {
        $product = Product::factory()->stock(0)->create();
        $this->post(route('wishlist.toggle', $product));

        $this->post(route('wishlist.move', $product))->assertSessionHas('error');

        $this->assertEmpty(session('cart.items', []));
        $this->get(route('wishlist.index'))->assertInertia(fn ($page) => $page->where('wishlist', [$product->id]));
    }

    public function test_bag_item_is_saved_for_later(): void
    {
        $product = Product::factory()->create();
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);

        $this->post(route('cart.save', $product))->assertRedirect()->assertSessionHas('success');

        $this->assertEmpty(session('cart.items', []));
        $this->get(route('wishlist.index'))->assertInertia(fn ($page) => $page->where('wishlist', [$product->id]));
    }

    public function test_products_without_a_photo_are_kept_out_of_listings(): void
    {
        $shown = Product::factory()->create(['name' => 'Photo Tablets', 'slug' => 'photo-tablets']);
        $hidden = Product::factory()->withoutImage()->create(['name' => 'Blank Tablets', 'slug' => 'blank-tablets']);

        $this->getJson(route('search.suggest', ['q' => 'Tablets']))
            ->assertJsonPath('products.0.slug', $shown->slug)
            ->assertJsonCount(1, 'products');

        // Still reachable directly, with no hotlinked remote image.
        $this->get(route('products.show', $hidden))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('product.image', null));
    }
}
