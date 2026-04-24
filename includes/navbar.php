<?php
$currentScript = $currentScript ?? basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');

if (!function_exists('zvActiveClass')) {
    function zvActiveClass($targets, $currentScript)
    {
        $files = is_array($targets) ? $targets : [$targets];
        foreach ($files as $file) {
            if ($currentScript === $file) {
                return ' is-active';
            }
        }
        return '';
    }
}

$primaryNav = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Daily Wellness', 'url' => 'shop-category-a.php'],
    ['label' => 'Skin & Derma', 'url' => 'shop-category-b.php'],
    ['label' => 'Oral & Nutrition', 'url' => 'shop-category-c.php'],
    ['label' => 'About Us', 'url' => 'about.php'],
    ['label' => 'Contact', 'url' => 'contact.php']
];

$quickGridLinks = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Daily Wellness', 'url' => 'shop-category-a.php'],
    ['label' => 'Skin & Derma', 'url' => 'shop-category-b.php'],
    ['label' => 'Oral & Nutrition', 'url' => 'shop-category-c.php'],
    ['label' => 'About Us', 'url' => 'about.php'],
    ['label' => 'Contact', 'url' => 'contact.php'],
    ['label' => 'Order Tracking', 'url' => 'order-tracking.php'],
    ['label' => 'Privacy Policy', 'url' => 'privacy-policy.php'],
    ['label' => 'Terms of Service', 'url' => 'terms-of-service.php']
];
?>

<header class="zv-header">
    <div class="zv-container px-1 py-3 sm:px-2">
        <div class="zv-navbar">
            <a href="index.php" class="zv-brand">
                <img src="frontend/assets/images/logo/logo.png" alt="Zovita logo" class="zv-brand-logo">
                <span class="zv-brand-text">
                    <strong>Zovita</strong>
                    <span>Health and Wellness</span>
                </span>
            </a>

            <div class="zv-navbar-middle">
                <div class="zv-search zv-search-desktop zv-search-premium" data-search-root>
                    <span class="zv-search-icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.35-4.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input class="zv-search-input" type="search" data-search-input autocomplete="off" spellcheck="false" placeholder="Search products" aria-label="Search products">
                    <div class="zv-suggestions" data-suggestions>
                        <div data-suggestions-list></div>
                    </div>
                </div>
            </div>

            <div class="zv-nav-actions">
                <div class="zv-quick-menu" data-quick-menu>
                    <button type="button" class="zv-btn-secondary zv-quick-toggle" data-quick-toggle aria-expanded="false">Quick Menu</button>
                    <div class="zv-quick-dropdown" data-quick-dropdown>
                        <p class="zv-quick-title">Browse</p>
                        <div class="zv-quick-grid">
                            <?php foreach ($quickGridLinks as $item): ?>
                                <a href="<?php echo $item['url']; ?>" data-nav-link class="zv-quick-link<?php echo zvActiveClass($item['url'], $currentScript); ?>"><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></a>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
                <a href="wishlist.php" data-nav-link class="zv-icon-link<?php echo zvActiveClass('wishlist.php', $currentScript); ?>" aria-label="Wishlist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span class="zv-icon-label">Wishlist</span>
                    <span class="zv-icon-badge" data-nav-count="wishlist">0</span>
                </a>
                <a href="cart.php" data-nav-link class="zv-icon-link<?php echo zvActiveClass('cart.php', $currentScript); ?>" aria-label="Cart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4zM7 13l-1 5h13M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span class="zv-icon-label">Cart</span>
                    <span class="zv-icon-badge" data-nav-count="cart">0</span>
                </a>
                <a href="login.php" class="zv-btn-secondary">Account</a>
                <button type="button" data-offcanvas-open class="zv-menu-button" aria-label="Open menu" aria-expanded="false">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <div class="zv-offcanvas-overlay" data-offcanvas-overlay></div>
    <aside class="zv-offcanvas" data-offcanvas>
        <div class="zv-offcanvas-panel">
            <div class="zv-offcanvas-header">
                <div class="zv-brand-text">
                    <strong>Zovita</strong>
                    <span>Navigation</span>
                </div>
                <button type="button" class="zv-offcanvas-close" data-offcanvas-close aria-label="Close menu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div class="zv-search zv-search-mobile zv-search-premium" data-search-root>
                <span class="zv-search-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35m1.35-4.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input class="zv-search-input" type="search" data-search-input autocomplete="off" spellcheck="false" placeholder="Search products" aria-label="Search products">
                <div class="zv-suggestions" data-suggestions>
                    <div data-suggestions-list></div>
                </div>
            </div>

            <nav class="zv-offcanvas-links" aria-label="Mobile navigation">
                <?php foreach ($primaryNav as $item): ?>
                    <a href="<?php echo $item['url']; ?>" data-nav-link class="<?php echo zvActiveClass($item['url'], $currentScript); ?>"><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></a>
                <?php endforeach; ?>
                <a href="account.php" data-nav-link class="<?php echo zvActiveClass('account.php', $currentScript); ?>">Account</a>
                <a href="order-tracking.php" data-nav-link class="<?php echo zvActiveClass('order-tracking.php', $currentScript); ?>">Order Tracking</a>
                <a href="wishlist.php" data-nav-link class="<?php echo zvActiveClass('wishlist.php', $currentScript); ?>">Wishlist</a>
                <a href="cart.php" data-nav-link class="<?php echo zvActiveClass('cart.php', $currentScript); ?>">Cart</a>
                <a href="faq.php" data-nav-link class="<?php echo zvActiveClass('faq.php', $currentScript); ?>">FAQ</a>
                <a href="shipping-info.php" data-nav-link class="<?php echo zvActiveClass('shipping-info.php', $currentScript); ?>">Shipping info</a>
            </nav>

            <div class="zv-offcanvas-quick">
                <p class="zv-quick-title">Browse</p>
                <div class="zv-quick-grid">
                    <?php foreach ($quickGridLinks as $item): ?>
                        <a href="<?php echo $item['url']; ?>" data-nav-link class="zv-quick-link<?php echo zvActiveClass($item['url'], $currentScript); ?>"><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></a>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="mt-auto pt-3">
                <div class="zv-panel p-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contact us</p>
                    <a class="mt-1 block text-sm font-bold text-navy-900" href="mailto:help@zovita.pk">help@zovita.pk</a>
                    <a class="mt-1 block text-sm font-bold text-navy-900" href="tel:+923001234567">+92 300 1234567</a>
                    <div class="mt-3 flex gap-2">
                        <a href="login.php" class="zv-btn-secondary w-full">Login</a>
                        <a href="signup.php" class="zv-btn-primary w-full">Join</a>
                    </div>
                </div>
            </div>
        </div>
    </aside>
</header>