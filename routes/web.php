<?php

use App\Http\Controllers\Account\DashboardController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Pages\ContactController;
use App\Http\Controllers\Pages\NewsletterController;
use App\Http\Controllers\Pages\PageController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\Storefront\BodyMapController;
use App\Http\Controllers\Storefront\CartController;
use App\Http\Controllers\Storefront\CheckoutController;
use App\Http\Controllers\Storefront\HomeController;
use App\Http\Controllers\Storefront\OrderTrackingController;
use App\Http\Controllers\Storefront\PrescriptionController;
use App\Http\Controllers\Storefront\ProductController;
use App\Http\Controllers\Storefront\SearchController;
use App\Http\Controllers\Storefront\ShopController;
use App\Http\Controllers\Storefront\WishlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Storefront
|--------------------------------------------------------------------------
*/

Route::get('/', HomeController::class)->name('home');
Route::get('/sitemap.xml', [SitemapController::class, 'sitemap'])->name('sitemap');
Route::get('/robots.txt', [SitemapController::class, 'robots'])->name('robots');

// Clean, query-free shop URLs: /shop/{department}/{category}/brand-x/sort-price-asc/page-2 (see App\Support\ShopPath).
Route::get('/shop/{department}', [ShopController::class, 'department'])->where('department', '[a-z0-9-]+')->name('shop.department');
Route::get('/shop/{path?}', [ShopController::class, 'index'])->where('path', '[A-Za-z0-9/_%-]+')->name('shop.index');
Route::get('/product/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/body-map', [BodyMapController::class, 'show'])->name('body-map');
Route::get('/body-map/recommend/{symptom}', [BodyMapController::class, 'recommend'])->where('symptom', '[a-z0-9-]+')->middleware('throttle:60,1')->name('body-map.recommend');
Route::get('/search/suggest', SearchController::class)->middleware('throttle:60,1')->name('search.suggest');

Route::prefix('bag')->name('cart.')->controller(CartController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/', 'store')->middleware('throttle:60,1')->name('store');
    Route::patch('/{product}', 'update')->name('update');
    Route::delete('/{product}', 'destroy')->name('destroy');
});

Route::get('/wishlist', [WishlistController::class, 'index'])->name('wishlist.index');
Route::post('/wishlist/{product}', [WishlistController::class, 'toggle'])->middleware('throttle:60,1')->name('wishlist.toggle');

Route::prefix('checkout')->name('checkout.')->controller(CheckoutController::class)->group(function () {
    Route::get('/', 'create')->name('create');
    Route::post('/', 'store')->middleware('throttle:6,1')->name('store');
    Route::get('/thank-you/{order:number}', 'success')->name('success');
});

Route::get('/prescription', [PrescriptionController::class, 'create'])->name('prescriptions.create');
Route::post('/prescription', [PrescriptionController::class, 'store'])->middleware('throttle:5,10')->name('prescriptions.store');

Route::get('/track-order', [OrderTrackingController::class, 'create'])->name('orders.track');
Route::post('/track-order', [OrderTrackingController::class, 'lookup'])->middleware('throttle:10,1')->name('orders.track.lookup');
Route::get('/track-order/{order:number}', [OrderTrackingController::class, 'show'])->name('orders.track.show');

/*
|--------------------------------------------------------------------------
| Content pages
|--------------------------------------------------------------------------
*/

Route::controller(PageController::class)->group(function () {
    Route::get('/about', 'about')->name('about');
    Route::get('/faq', 'faq')->name('faq');
    Route::get('/contact', 'contact')->name('contact');
    Route::get('/policies/{page}', 'legal')->whereIn('page', PageController::LEGAL)->name('legal');
});
Route::post('/contact', ContactController::class)->middleware('throttle:5,10')->name('contact.store');
Route::post('/newsletter', NewsletterController::class)->middleware('throttle:5,10')->name('newsletter.store');

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [SessionController::class, 'create'])->name('login');
    Route::post('/login', [SessionController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/register', [RegisterController::class, 'create'])->name('register');
    Route::post('/register', [RegisterController::class, 'store'])->middleware('throttle:5,10');

    Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'email'])->middleware('throttle:5,10')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:5,10')->name('password.store');
});

Route::post('/logout', [SessionController::class, 'destroy'])->middleware('auth')->name('logout');

/*
|--------------------------------------------------------------------------
| Customer account
|--------------------------------------------------------------------------
*/

Route::middleware('auth')->prefix('account')->name('account.')->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');
    Route::get('/orders/{order:number}', [OrderController::class, 'show'])->name('orders.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/password', [ProfileController::class, 'password'])->middleware('throttle:6,1')->name('password.update');
});
