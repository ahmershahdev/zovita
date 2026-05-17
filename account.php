<?php
$pageKey = 'account';
$pageTitle = 'My Account | Zovita';
$pageDescription = 'Manage your Zovita account profile, order history, addresses, and saved healthcare preferences.';
$pageStyles = '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'My account']
];
require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="account">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12" data-account-root>
        <div class="zv-container px-2 sm:px-3">
            <section class="zv-hero zv-hero-premium p-6 sm:p-8 lg:p-10">
                <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                        <span class="zv-chip">Account dashboard</span>
                        <h1 class="zv-page-title">Welcome back, Ahmer</h1>
                        <p class="zv-page-lead">Manage your healthcare profile, saved addresses, and active orders with a premium account dashboard.</p>
                        <div class="mt-5 flex flex-wrap gap-3">
                            <a href="order-tracking.php" class="zv-btn-primary">Track orders</a>
                            <a href="wishlist.php" class="zv-btn-secondary">View wishlist</a>
                        </div>
                    </div>
                    <div class="zv-grid-cards cols-2">
                        <article class="zv-kpi-card">
                            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Total orders</p>
                            <p class="mt-2 text-3xl font-bold text-navy-900">18</p>
                            <p class="mt-2 text-xs text-slate-500">Last 12 months</p>
                        </article>
                        <article class="zv-kpi-card">
                            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Active shipments</p>
                            <p class="mt-2 text-3xl font-bold text-navy-900">2</p>
                            <p class="mt-2 text-xs text-slate-500">Live tracking enabled</p>
                        </article>
                        <article class="zv-kpi-card">
                            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Wishlist items</p>
                            <p class="mt-2 text-3xl font-bold text-navy-900">14</p>
                            <p class="mt-2 text-xs text-slate-500">Care ideas saved</p>
                        </article>
                        <article class="zv-kpi-card">
                            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Saved addresses</p>
                            <p class="mt-2 text-3xl font-bold text-navy-900">3</p>
                            <p class="mt-2 text-xs text-slate-500">Delivery ready</p>
                        </article>
                    </div>
                </div>
            </section>

            <section class="zv-section-lg grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div class="grid gap-4">
                    <article class="zv-panel p-6 sm:p-8">
                        <div class="zv-profile-head">
                            <div class="zv-avatar" data-avatar-preview>
                                <span>AS</span>
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-slate-500">Premium member</p>
                                <h2 class="text-2xl font-bold">Ahmer Shah</h2>
                                <p class="text-sm text-slate-600">ahmer@gmail.com</p>
                            </div>
                        </div>
                        <div class="mt-6 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label class="zv-label" for="account-name">Full name</label>
                                <input id="account-name" class="zv-input" type="text" value="Ahmer Shah">
                            </div>
                            <div>
                                <label class="zv-label" for="account-phone">Phone number</label>
                                <input id="account-phone" class="zv-input" type="tel" value="+92 300 1234567">
                            </div>
                            <div>
                                <label class="zv-label" for="account-email">Email address</label>
                                <input id="account-email" class="zv-input" type="email" value="ahmer@gmail.com" readonly>
                            </div>
                            <div>
                                <label class="zv-label" for="account-preference">Preferred communication</label>
                                <input id="account-preference" class="zv-input" type="text" value="Email and SMS">
                            </div>
                        </div>
                        <div class="mt-5">
                            <label class="zv-label" for="account-avatar">Profile picture</label>
                            <input id="account-avatar" class="zv-input" type="file" accept="image/*" data-avatar-input>
                            <p class="zv-upload-note">PNG or JPG up to 5MB.</p>
                        </div>
                    </article>

                    <article class="zv-panel p-6 sm:p-8">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 class="text-2xl font-bold">Primary delivery address</h2>
                                <p class="mt-1 text-sm text-slate-600">Update your pin location to ensure accurate delivery.</p>
                            </div>
                            <button type="button" class="zv-btn-secondary" data-map-locate>Use current location</button>
                        </div>
                        <div class="mt-5 zv-map-shell">
                            <div id="account-map" class="zv-map" data-account-map></div>
                        </div>
                        <div class="mt-5 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label class="zv-label" for="address-label">Address label</label>
                                <input id="address-label" class="zv-input" type="text" placeholder="Home, Office">
                            </div>
                            <div>
                                <label class="zv-label" for="address-city">City</label>
                                <input id="address-city" class="zv-input" type="text" placeholder="Karachi">
                            </div>
                            <div>
                                <label class="zv-label" for="address-line">Street address</label>
                                <input id="address-line" class="zv-input" type="text" placeholder="Street, area, landmark">
                            </div>
                            <div>
                                <label class="zv-label" for="address-postal">Postal code</label>
                                <input id="address-postal" class="zv-input" type="text" placeholder="74000">
                            </div>
                            <div>
                                <label class="zv-label" for="address-lat">Latitude</label>
                                <input id="address-lat" class="zv-input" type="text" data-map-lat readonly>
                            </div>
                            <div>
                                <label class="zv-label" for="address-lng">Longitude</label>
                                <input id="address-lng" class="zv-input" type="text" data-map-lng readonly>
                            </div>
                        </div>
                    </article>
                </div>

                <aside class="zv-panel p-6 sm:p-8">
                    <h2 class="text-2xl font-bold">Recent orders</h2>
                    <div class="mt-4 space-y-3">
                        <div class="zv-kpi-card">
                            <p class="text-sm font-semibold text-navy-900">ZV-2026-000123</p>
                            <p class="text-xs text-slate-600">3 items | Dispatched</p>
                        </div>
                        <div class="zv-kpi-card">
                            <p class="text-sm font-semibold text-navy-900">ZV-2026-000118</p>
                            <p class="text-xs text-slate-600">2 items | Delivered</p>
                        </div>
                        <div class="zv-kpi-card">
                            <p class="text-sm font-semibold text-navy-900">ZV-2026-000110</p>
                            <p class="text-xs text-slate-600">4 items | Delivered</p>
                        </div>
                    </div>
                    <div class="mt-5 zv-panel zv-hero-premium p-4">
                        <p class="text-sm font-semibold text-navy-900">Care preferences</p>
                        <p class="mt-2 text-sm text-slate-600">Weekly multivitamin reminders, seasonal immunity alerts, and refill tracking are active.</p>
                    </div>
                </aside>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>