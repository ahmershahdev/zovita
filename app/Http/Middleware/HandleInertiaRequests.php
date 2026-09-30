<?php

namespace App\Http\Middleware;

use App\Models\Department;
use App\Services\Cart\CartService;
use App\Services\Security\RecaptchaService;
use App\Services\Wishlist\WishlistService;
use App\Support\CatalogCache;
use App\Support\Seo;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name'),
                'url' => url('/'),
                'support' => [
                    'email' => config('zovita.support_email'),
                    'phone' => config('zovita.support_phone'),
                    'hours' => config('zovita.support_hours'),
                ],
                'freeDeliveryOver' => (int) config('zovita.free_delivery_over'),
                'author' => config('zovita.author'),
            ],
            // Controllers override this with App\Support\Seo::set(); shared so every page has meta.
            'seo' => Seo::defaults(),
            'auth' => [
                'user' => fn () => $request->user()?->only('id', 'name', 'email'),
            ],
            'cart' => ['count' => fn () => app(CartService::class)->count()],
            'wishlist' => fn () => app(WishlistService::class)->ids(),
            'nav' => fn () => CatalogCache::remember('nav', now()->addHour(), fn () => Department::orderBy('sort_order')
                ->with(['categories' => fn ($q) => $q->withCount('products')->orderByDesc('products_count')])
                ->get()
                ->map(fn (Department $d) => [
                    'name' => $d->name,
                    'slug' => $d->slug,
                    'blurb' => $d->blurb,
                    'count' => $d->categories->sum('products_count'),
                    'image' => $d->products()->where('is_featured', true)->first()?->thumb ?? $d->products()->first()?->thumb,
                    'categories' => $d->categories->take(6)->map->only('name', 'slug')->values(),
                ])->all()),
            'recaptcha' => fn () => app(RecaptchaService::class)->clientConfig(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
