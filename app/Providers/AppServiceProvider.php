<?php

namespace App\Providers;

use App\Models\Product;
use App\Services\Cart\CartService;
use App\Services\Wishlist\WishlistService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
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

        // Site-wide request budget per client (on top of the stricter per-route throttles on forms,
        // search and checkout). Reads are generous; writes are tighter. Signed-in users are keyed by
        // account so a shared office IP doesn't lock everyone out.
        RateLimiter::for('storefront', function (Request $request) {
            // Trusted callers (uptime monitors, the load balancer's health checks, load tests) skip the budget.
            if (in_array($request->ip(), (array) config('zovita.rate_limit_allowlist'), true)) {
                return Limit::none();
            }
            $key = $request->user()?->id ? 'u:'.$request->user()->id : 'ip:'.$request->ip();

            return $request->isMethodSafe()
                ? Limit::perMinute(300)->by($key)
                : [Limit::perMinute(60)->by($key), Limit::perSecond(8)->by($key.':burst')];
        });

        // Storefront caches depend on the catalog; drop them whenever a product changes.
        Product::saved(fn () => Cache::forget('home.v1'));
        Product::deleted(fn () => Cache::forget('home.v1'));
    }
}
