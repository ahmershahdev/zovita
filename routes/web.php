<?php

use App\Http\Controllers\Account\DashboardController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Admin\AdminSessionController as AdminSession;
use App\Http\Controllers\Admin\DashboardController as AdminDashboard;
use App\Http\Controllers\Admin\OrderController as AdminOrders;
use App\Http\Controllers\Admin\PrescriptionController as AdminPrescriptions;
use App\Http\Controllers\Admin\ProductController as AdminProducts;
use App\Http\Controllers\Admin\UserController as AdminUsers;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Pages\ContactController;
use App\Http\Controllers\Pages\NewsletterController;
use App\Http\Controllers\Pages\PageController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\Storefront\AssistantController;
use App\Http\Controllers\Storefront\BodyMapController;
use App\Http\Controllers\Storefront\CartController;
use App\Http\Controllers\Storefront\CheckoutController;
use App\Http\Controllers\Storefront\HomeController;
use App\Http\Controllers\Storefront\OrderTrackingController;
use App\Http\Controllers\Storefront\PrescriptionController;
use App\Http\Controllers\Storefront\ProductController;
use App\Http\Controllers\Storefront\SearchController;
use App\Http\Controllers\Storefront\ShopController;
use App\Http\Controllers\Storefront\SignalController;
use App\Http\Controllers\Storefront\WishlistController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Storefront
|--------------------------------------------------------------------------
*/

Route::get('/', HomeController::class)->name('home');
Route::get('/suspended', fn () => Inertia::render('Auth/Suspended', ['ban' => session('ban', [])]))->name('suspended');
Route::post('/locale', LocaleController::class)->middleware('throttle:20,1,locale.update')->name('locale.update');
Route::get('/sitemap.xml', [SitemapController::class, 'sitemap'])->name('sitemap');
Route::get('/robots.txt', [SitemapController::class, 'robots'])->name('robots');
Route::get('/llms.txt', [SitemapController::class, 'llms'])->name('llms');
Route::get('/llms-full.txt', [SitemapController::class, 'llmsFull'])->name('llms.full');

// Clean, query-free shop URLs: /shop/{department}/{category}/brand-x/sort-price-asc/page-2 (see App\Support\ShopPath).
Route::get('/shop/{department}', [ShopController::class, 'department'])->where('department', '[a-z0-9-]+')->name('shop.department');
Route::get('/shop/{path?}', [ShopController::class, 'index'])->where('path', '[A-Za-z0-9/_%-]+')->name('shop.index');
Route::get('/product/{product:slug}', [ProductController::class, 'show'])->name('products.show');
Route::get('/body-map', [BodyMapController::class, 'show'])->name('body-map');
Route::get('/body-map/recommend/{symptom}', [BodyMapController::class, 'recommend'])->where('symptom', '[a-z0-9-]+')->middleware('throttle:60,1,bodymap.recommend')->name('body-map.recommend');
Route::get('/assistant/{intent}', AssistantController::class)->where('intent', '[a-z_]+')->middleware('throttle:40,1,assistant')->name('assistant');
Route::post('/signals/dwell', [SignalController::class, 'dwell'])->middleware('throttle:60,1,signals.dwell')->name('signals.dwell');
Route::post('/signals/experiment', [SignalController::class, 'experiment'])->middleware('throttle:60,1,signals.experiment')->name('signals.experiment');
Route::get('/search/suggest', SearchController::class)->middleware('throttle:60,1,search.suggest')->name('search.suggest');

Route::prefix('bag')->name('cart.')->controller(CartController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/', 'store')->middleware('throttle:60,1,cart.store')->name('store');
    Route::patch('/{product}', 'update')->name('update');
    Route::delete('/{product}', 'destroy')->name('destroy');
    Route::post('/{product}/save-for-later', 'saveForLater')->middleware('throttle:60,1,cart.save')->name('save');
});

Route::get('/wishlist', [WishlistController::class, 'index'])->name('wishlist.index');
Route::post('/wishlist/{product}', [WishlistController::class, 'toggle'])->middleware('throttle:60,1,wishlist.toggle')->name('wishlist.toggle');
Route::post('/wishlist/{product}/move-to-bag', [WishlistController::class, 'moveToBag'])->middleware('throttle:60,1,wishlist.move')->name('wishlist.move');

Route::prefix('checkout')->name('checkout.')->controller(CheckoutController::class)->group(function () {
    Route::get('/', 'create')->name('create');
    Route::post('/', 'store')->middleware('throttle:6,1,checkout.store')->name('store');
    Route::get('/thank-you/{order:number}', 'success')->name('success');
});

Route::get('/prescription', [PrescriptionController::class, 'create'])->name('prescriptions.create');
Route::post('/prescription', [PrescriptionController::class, 'store'])->middleware('throttle:5,10,prescriptions.store')->name('prescriptions.store');

Route::get('/track-order', [OrderTrackingController::class, 'create'])->name('orders.track');
Route::post('/track-order', [OrderTrackingController::class, 'lookup'])->middleware('throttle:10,1,orders.track.lookup')->name('orders.track.lookup');
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
Route::post('/contact', ContactController::class)->middleware('throttle:5,10,contact.store')->name('contact.store');
Route::post('/newsletter', NewsletterController::class)->middleware('throttle:5,10,newsletter.store')->name('newsletter.store');

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [SessionController::class, 'create'])->name('login');
    Route::post('/login', [SessionController::class, 'store'])->middleware('throttle:10,1,login');
    Route::get('/register', [RegisterController::class, 'create'])->name('register');
    Route::post('/register', [RegisterController::class, 'store'])->middleware('throttle:5,10,register');

    Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'email'])->middleware('throttle:5,10,password.email')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:5,10,password.store')->name('password.store');
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
    Route::post('/avatar', [ProfileController::class, 'avatar'])->middleware('throttle:10,1,avatar.update')->name('avatar.update');
    Route::delete('/avatar', [ProfileController::class, 'removeAvatar'])->name('avatar.destroy');
    Route::put('/password', [ProfileController::class, 'password'])->middleware('throttle:6,1,password.update')->name('password.update');
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
| Signed-in admins only (EnsureAdmin answers 404 to everyone else).
*/

// Staff sign-in: unlinked, noindex, 5 attempts then a 15-minute lock (see LoginRequest).
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminSession::class, 'create'])->name('login');
    Route::post('/login', [AdminSession::class, 'store'])->middleware('throttle:5,1,login.admin');
    Route::post('/logout', [AdminSession::class, 'destroy'])->name('logout');
});

Route::middleware(['admin', 'throttle:120,1,admin.panel'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', AdminDashboard::class)->name('dashboard');
    Route::get('/orders', [AdminOrders::class, 'index'])->name('orders.index');
    Route::get('/orders/{order:number}', [AdminOrders::class, 'show'])->name('orders.show');
    Route::patch('/orders/{order:number}', [AdminOrders::class, 'update'])->name('orders.update');
    Route::get('/users', [AdminUsers::class, 'index'])->name('users.index');
    Route::get('/users/{user}', [AdminUsers::class, 'show'])->name('users.show');
    Route::post('/users/{user}/ban', [AdminUsers::class, 'ban'])->name('users.ban');
    Route::patch('/users/{user}/username', [AdminUsers::class, 'username'])->name('users.username');
    Route::delete('/users/{user}/ban', [AdminUsers::class, 'unban'])->name('users.unban');
    Route::get('/prescriptions', [AdminPrescriptions::class, 'index'])->name('prescriptions.index');
    Route::patch('/prescriptions/{prescription}', [AdminPrescriptions::class, 'update'])->name('prescriptions.update');
    Route::get('/prescriptions/{prescription}/file', [AdminPrescriptions::class, 'file'])->name('prescriptions.file');
    Route::get('/products', [AdminProducts::class, 'index'])->name('products.index');
    Route::patch('/products/{product:id}', [AdminProducts::class, 'update'])->name('products.update');
});

// Unknown URLs: a 404 that still runs the web middleware (session, shared props) for the error page.
Route::fallback(fn () => abort(404));
