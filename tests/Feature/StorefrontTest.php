<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_render(): void
    {
        Product::factory()->count(3)->create();

        foreach (['home', 'shop.index', 'about', 'faq', 'contact', 'prescriptions.create', 'orders.track', 'login', 'register', 'wishlist.index'] as $name) {
            $this->get(route($name))->assertOk();
        }
        $this->get(route('legal', 'privacy'))->assertOk();
    }

    public function test_shop_filters_by_search_price_and_prescription(): void
    {
        $cheap = Product::factory()->create(['name' => 'Panadol Tablets', 'price' => 50]);
        Product::factory()->create(['name' => 'Brufen Syrup', 'price' => 300]);
        Product::factory()->prescription()->create(['name' => 'Augmentin Tablets', 'price' => 900]);

        $this->get(route('shop.index', ['q' => 'panadol']))
            ->assertInertia(fn ($page) => $page->where('products.total', 1)->where('products.data.0.id', $cheap->id));

        $this->get(route('shop.index', ['max' => 400]))->assertInertia(fn ($page) => $page->where('products.total', 2));
        $this->get(route('shop.index', ['rx' => 'rx']))->assertInertia(fn ($page) => $page->where('products.total', 1));
        $this->get(route('shop.index', ['sort' => 'price_desc']))->assertInertia(fn ($page) => $page->where('products.data.0.name', 'Augmentin Tablets'));
    }

    public function test_malformed_filters_are_ignored(): void
    {
        Product::factory()->create();

        $this->get('/shop?sort=drop&min=abc&category[]=x&brand[]=y')->assertOk();
    }

    public function test_product_page_and_search_suggestions(): void
    {
        $product = Product::factory()->create(['name' => 'Vitamin C Chewable', 'generics' => 'Ascorbic acid']);

        $this->get(route('products.show', $product))->assertInertia(fn ($page) => $page
            ->component('Product/Show')
            ->where('product.generics', 'Ascorbic acid'));

        $this->getJson(route('search.suggest', ['q' => 'ascorbic']))->assertOk()->assertJsonPath('products.0.slug', $product->slug);
    }

    public function test_unknown_product_is_404(): void
    {
        $this->get('/product/does-not-exist')->assertNotFound();
    }
}
