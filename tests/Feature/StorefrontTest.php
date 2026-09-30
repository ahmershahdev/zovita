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

        $this->get('/shop/search-panadol')
            ->assertInertia(fn ($page) => $page->where('products.total', 1)->where('products.data.0.id', $cheap->id));

        $this->get('/shop/price-0-400')->assertInertia(fn ($page) => $page->where('products.total', 2));
        $this->get('/shop/prescription')->assertInertia(fn ($page) => $page->where('products.total', 1));
        $this->get('/shop/sort-price-desc')->assertInertia(fn ($page) => $page->where('products.data.0.name', 'Augmentin Tablets'));
        $this->get('/shop/medicines/pain-fever-relief/sort-price-desc')
            ->assertInertia(fn ($page) => $page->where('department.slug', 'medicines')->where('filters.category', 'pain-fever-relief')->where('products.total', 3));
    }

    public function test_malformed_filters_are_ignored(): void
    {
        Product::factory()->create();

        $this->get('/shop?sort=drop&min=abc&category[]=x&brand[]=y')->assertRedirect(url('/shop'));
        $this->get('/shop/sort-drop/price-abc/brand-')->assertOk();
    }

    public function test_product_page_and_search_suggestions(): void
    {
        $product = Product::factory()->create(['name' => 'Vitamin C Chewable', 'generics' => 'Ascorbic acid']);

        $this->get(route('products.show', $product))->assertInertia(fn ($page) => $page
            ->component('Product/Show')
            ->where('product.generics', 'Ascorbic acid'));

        $this->getJson(route('search.suggest', ['q' => 'ascorbic']))->assertOk()->assertJsonPath('products.0.slug', $product->slug);
    }

    public function test_legacy_query_urls_redirect_to_clean_paths(): void
    {
        Product::factory()->create();

        $this->get('/shop/medicines?category=pain-fever-relief&sort=price_asc&page=2')
            ->assertStatus(301)
            ->assertRedirect(url('/shop/medicines/pain-fever-relief/sort-price-asc/page-2'));
        $this->get('/shop?q=Vitamin D&in_stock=1')->assertRedirect(url('/shop/in-stock/search-vitamin-d'));
    }

    public function test_shop_pagination_links_are_clean(): void
    {
        Product::factory()->count(30)->create();

        $this->get('/shop/page-2')->assertInertia(fn ($page) => $page
            ->where('products.current_page', 2)
            ->where('products.links.0.url', url('/shop'))
            ->where('canonical', url('/shop/page-2')));
        $this->get('/shop/page-99')->assertRedirect(url('/shop/page-2'));
    }

    public function test_unknown_product_is_404(): void
    {
        $this->get('/product/does-not-exist')->assertNotFound();
    }
}
