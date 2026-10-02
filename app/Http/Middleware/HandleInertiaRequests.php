<?php

namespace App\Http\Middleware;

use App\Models\Department;
use App\Models\Prescription;
use App\Services\Cart\CartService;
use App\Services\Experiments\Experiments;
use App\Services\Personalization\OfferEngine;
use App\Services\Security\RecaptchaService;
use App\Services\Wishlist\WishlistService;
use App\Support\CatalogCache;
use App\Support\Seo;
use Illuminate\Http\Request;
use Inertia\Inertia;
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
                'deliveryFee' => (int) config('zovita.delivery_fee'),
                'store' => config('zovita.store'),
                'author' => config('zovita.author'),
            ],
            // Controllers override this with App\Support\Seo::set(); shared so every page has meta.
            'seo' => Seo::defaults(),
            'locale' => [
                'code' => app()->getLocale(),
                'dir' => SetLocale::dir(),
                'available' => SetLocale::LOCALES,
            ],
            // UI dictionary, sent once per language and cached by the client across visits.
            'messages' => Inertia::once(fn () => app()->getLocale() === 'en' ? (object) [] : (json_decode((string) @file_get_contents(lang_path(app()->getLocale().'.json')), true) ?: (object) []))
                ->as('messages-'.app()->getLocale()),
            'auth' => [
                'user' => fn () => $request->user() ? $request->user()->only('id', 'name', 'email') + ['is_admin' => $request->user()->isAdmin()] : null,
            ],
            'cart' => ['count' => fn () => app(CartService::class)->count()],
            'wishlist' => fn () => app(WishlistService::class)->ids(),
            // Personal prices shown on cards: product id => % off, plus any order-wide offer.
            'personal' => function () {
                $offers = app(OfferEngine::class)->active();

                return [
                    'products' => (object) $offers->whereNotNull('product_id')->mapWithKeys(fn ($o) => [$o->product_id => $o->percent])->all(),
                    'order' => $offers->whereNull('product_id')->first()?->toClient(),
                    'count' => $offers->count(),
                ];
            },
            'experiments' => fn () => app(Experiments::class)->assignments(),
            // Badge counts for the admin sidebar (admins only).
            'admin' => fn () => $request->user()?->isAdmin() ? [
                'prescriptions' => Prescription::whereIn('status', ['received', 'reviewing'])->count(),
            ] : null,
            'nav' => fn () => CatalogCache::remember('nav', now()->addHour(), fn () => Department::orderBy('sort_order')
                ->with(['categories' => fn ($q) => $q->withCount(['products' => fn ($p) => $p->listed()])->orderByDesc('products_count')])
                ->get()
                ->map(fn (Department $d) => [
                    'name' => $d->name,
                    'slug' => $d->slug,
                    'blurb' => $d->blurb,
                    'count' => $d->categories->sum('products_count'),
                    'image' => $d->products()->listed()->where('is_featured', true)->first()?->thumb ?? $d->products()->listed()->first()?->thumb,
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
