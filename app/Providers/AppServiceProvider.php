<?php

namespace App\Providers;

use App\Models\Product;
use App\Services\Cart\CartService;
use App\Services\Wishlist\WishlistService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(CartService::class, fn ($app) => new CartService($app['session.store']));
        $this->app->scoped(WishlistService::class, fn ($app) => new WishlistService($app['session.store'], $app['auth']));
    }

    public function boot(): void
    {
        // Catch lazy-loading and mass-assignment mistakes while developing.
        Model::shouldBeStrict(! $this->app->isProduction());

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        // Storefront caches depend on the catalog; drop them whenever a product changes.
        Product::saved(fn () => Cache::forget('home.v1'));
        Product::deleted(fn () => Cache::forget('home.v1'));
    }
}
