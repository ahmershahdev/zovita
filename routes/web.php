<?php

use App\Http\Controllers\Account\DashboardController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Account\RefillController;
use App\Http\Controllers\Account\TwoFactorController as AccountTwoFactor;
use App\Http\Controllers\Admin\AdminSessionController as AdminSession;
use App\Http\Controllers\Admin\DashboardController as AdminDashboard;
use App\Http\Controllers\Admin\OrderController as AdminOrders;
use App\Http\Controllers\Admin\PrescriptionController as AdminPrescriptions;
use App\Http\Controllers\Admin\ProductController as AdminProducts;
use App\Http\Controllers\Admin\SecurityController as AdminSecurity;
use App\Http\Controllers\Admin\StaffController as AdminStaff;
use App\Http\Controllers\Admin\UserController as AdminUsers;
use App\Http\Controllers\Auth\EmailCodeLoginController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
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
use App\Http\Controllers\Storefront\PaymentController;
use App\Http\Controllers\Storefront\PrescriptionController;
use App\Http\Controllers\Storefront\ProductController;
use App\Http\Controllers\Storefront\SearchController;
use App\Http\Controllers\Storefront\ShopController;
use App\Http\Controllers\Storefront\SignalController;
use App\Http\Controllers\Storefront\WishlistController;
use App\Http\Controllers\WebhookController;
use App\Http\Middleware\EnsureNotBanned;
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

// Card payments: return page (shows what the verified webhook decided), retry, and the sandbox
// gateway's own page (local/dev only). Webhooks skip the session budget and CSRF; the signature is
// what makes them trusted.
Route::get('/checkout/payment/{order:number}', [PaymentController::class, 'show'])->name('payments.return');
Route::post('/checkout/payment/{order:number}/retry', [PaymentController::class, 'retry'])->middleware('throttle:10,1,payments.retry')->name('payments.retry');
Route::get('/payments/sandbox/{payment}', [PaymentController::class, 'sandbox'])->name('payments.sandbox.show');
Route::post('/payments/sandbox/{payment}', [PaymentController::class, 'sandboxComplete'])->middleware('throttle:10,1,payments.sandbox')->name('payments.sandbox.complete');
Route::post('/webhooks/payments/{provider}', WebhookController::class)
    ->withoutMiddleware(['throttle:storefront', EnsureNotBanned::class])
    ->middleware('throttle:300,1,webhooks')
    ->name('webhooks.payments');

// Refill reminder e-mails: a signed one-tap link that puts the medicine back in the bag.
Route::get('/refills/{reminder}/reorder', [RefillController::class, 'reorder'])->middleware(['signed', 'throttle:20,1,refills.reorder'])->name('refills.reorder');

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
    Route::get('/login/code', [EmailCodeLoginController::class, 'create'])->name('login.code');
    Route::post('/login/code', [EmailCodeLoginController::class, 'store'])->middleware('throttle:5,10,login.code')->name('login.code.send');

    Route::get('/forgot-password', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'email'])->middleware('throttle:5,10,password.email')->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:5,10,password.store')->name('password.store');
});

// Second sign-in step for customers who turned on two-step sign-in.
Route::get('/two-factor-challenge', [TwoFactorChallengeController::class, 'create'])->name('two-factor.challenge');
Route::post('/two-factor-challenge', [TwoFactorChallengeController::class, 'store'])->middleware('throttle:10,1,two-factor')->name('two-factor.verify');
Route::post('/two-factor-challenge/resend', [TwoFactorChallengeController::class, 'resend'])->middleware('throttle:5,10,two-factor.resend')->name('two-factor.resend');

Route::post('/logout', [SessionController::class, 'destroy'])->middleware('auth')->name('logout');

// E-mail confirmation: a signed link that expires after 10 minutes, and a resend button.
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware(['signed', 'throttle:10,1,verification.verify'])->name('verification.verify');
Route::post('/email/verification-notification', [EmailVerificationController::class, 'send'])->middleware(['auth', 'throttle:3,10,verification.send'])->name('verification.send');

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

    Route::post('/two-factor', [AccountTwoFactor::class, 'start'])->name('two-factor.start');
    Route::post('/two-factor/confirm', [AccountTwoFactor::class, 'confirm'])->middleware('throttle:10,1,two-factor.confirm')->name('two-factor.confirm');
    Route::delete('/two-factor/setup', [AccountTwoFactor::class, 'cancel'])->name('two-factor.cancel');
    Route::delete('/two-factor', [AccountTwoFactor::class, 'destroy'])->middleware('throttle:6,1,two-factor.disable')->name('two-factor.destroy');
    Route::post('/two-factor/recovery-codes', [AccountTwoFactor::class, 'recoveryCodes'])->middleware('throttle:6,1,two-factor.recovery')->name('two-factor.recovery');

    Route::post('/refills/{reminder}/reorder', [RefillController::class, 'reorder'])->middleware('throttle:20,1,refills.add')->name('refills.add');
    Route::delete('/refills/{reminder}', [RefillController::class, 'dismiss'])->name('refills.dismiss');
    Route::put('/preferences', [RefillController::class, 'preferences'])->name('preferences.update');
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
| Signed-in admins only (EnsureAdmin answers 404 to everyone else).
*/

// Staff sign-in: unlinked, noindex, 5 attempts then a 15-minute lock (see LoginRequest), then a
// mandatory second step: the authenticator app's code, or a 6-digit code e-mailed to them until
// they set one up. Both answer 404 unless a staff password was just entered on this browser.
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminSession::class, 'create'])->name('login');
    Route::post('/login', [AdminSession::class, 'store'])->middleware('throttle:5,1,login.admin');
    Route::post('/logout', [AdminSession::class, 'destroy'])->name('logout');
    Route::get('/two-factor', [TwoFactorChallengeController::class, 'create'])->defaults('staff', true)->name('two-factor.challenge');
    Route::post('/two-factor', [TwoFactorChallengeController::class, 'store'])->defaults('staff', true)->middleware('throttle:10,1,admin.two-factor')->name('two-factor.verify');
    Route::post('/two-factor/resend', [TwoFactorChallengeController::class, 'resend'])->defaults('staff', true)->middleware('throttle:5,10,admin.two-factor.resend')->name('two-factor.resend');
});

// Every admin route needs a staff session that passed two-step sign-in (EnsureAdmin) and the
// permission its role grants (EnsureStaffCan, see App\Enums\StaffRole).
Route::middleware(['admin', 'throttle:120,1,admin.panel'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', AdminDashboard::class)->middleware('staff:dashboard')->name('dashboard');
    Route::get('/security', [AdminSecurity::class, 'show'])->name('security');
    Route::post('/security/recovery-codes', [AdminSecurity::class, 'regenerate'])->middleware('throttle:5,1,admin.recovery')->name('security.recovery');
    Route::post('/security/authenticator', [AdminSecurity::class, 'start'])->name('security.authenticator.start');
    Route::post('/security/authenticator/confirm', [AdminSecurity::class, 'confirm'])->middleware('throttle:10,1,admin.authenticator')->name('security.authenticator.confirm');
    Route::delete('/security/authenticator/setup', [AdminSecurity::class, 'cancel'])->name('security.authenticator.cancel');
    Route::delete('/security/authenticator', [AdminSecurity::class, 'disable'])->middleware('throttle:5,1,admin.authenticator.off')->name('security.authenticator.destroy');

    Route::get('/orders', [AdminOrders::class, 'index'])->middleware('staff:orders.view')->name('orders.index');
    Route::get('/orders/{order:number}', [AdminOrders::class, 'show'])->middleware('staff:orders.view')->name('orders.show');
    Route::patch('/orders/{order:number}', [AdminOrders::class, 'update'])->middleware('staff:orders.update')->name('orders.update');
    Route::post('/orders/{order:number}/refund', [AdminOrders::class, 'refund'])->middleware(['staff:payments.refund', 'throttle:10,1,admin.refund'])->name('orders.refund');

    Route::get('/users', [AdminUsers::class, 'index'])->middleware('staff:customers.view')->name('users.index');
    Route::get('/users/{user}', [AdminUsers::class, 'show'])->middleware('staff:customers.view')->name('users.show');
    Route::post('/users/{user}/ban', [AdminUsers::class, 'ban'])->middleware('staff:customers.ban')->name('users.ban');
    Route::patch('/users/{user}/username', [AdminUsers::class, 'username'])->middleware('staff:customers.username')->name('users.username');
    Route::delete('/users/{user}/ban', [AdminUsers::class, 'unban'])->middleware('staff:customers.ban')->name('users.unban');

    Route::get('/prescriptions', [AdminPrescriptions::class, 'index'])->middleware('staff:prescriptions.review')->name('prescriptions.index');
    Route::patch('/prescriptions/{prescription}', [AdminPrescriptions::class, 'update'])->middleware('staff:prescriptions.review')->name('prescriptions.update');
    Route::get('/prescriptions/{prescription}/file', [AdminPrescriptions::class, 'file'])->middleware('staff:prescriptions.review')->name('prescriptions.file');

    Route::get('/products', [AdminProducts::class, 'index'])->middleware('staff:products.manage')->name('products.index');
    Route::patch('/products/{product:id}', [AdminProducts::class, 'update'])->middleware('staff:products.manage')->name('products.update');

    Route::middleware('staff:staff.manage')->group(function () {
        Route::get('/staff', [AdminStaff::class, 'index'])->name('staff.index');
        Route::post('/staff', [AdminStaff::class, 'store'])->name('staff.store');
        Route::patch('/staff/{user}', [AdminStaff::class, 'update'])->name('staff.update');
        Route::delete('/staff/{user}', [AdminStaff::class, 'destroy'])->name('staff.destroy');
        Route::post('/staff/{user}/reset-two-factor', [AdminStaff::class, 'resetTwoFactor'])->name('staff.reset-2fa');
    });
});

// Unknown URLs: a 404 that still runs the web middleware (session, shared props) for the error page.
Route::fallback(fn () => abort(404));
