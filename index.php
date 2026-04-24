<?php
$pageKey = 'home';
$pageTitle = 'Zovita | Trusted Pharmacy and Wellness Essentials in Pakistan';
$pageDescription = 'Zovita offers a premium healthcare shopping experience with trusted products, fast support, secure checkout, and category-based discovery.';
$pageKeywords = 'zovita, pharmacy, wellness, supplements, skincare, oral care, pakistan';
$breadcrumbs = [
    ['label' => 'Home']
];
require __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/products-data.php';

$featuredProducts = array_slice(zvGetAllProducts(), 0, 15);
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="home">
    <div class="zv-orb zv-float h-52 w-52 -top-14 -left-10"></div>
    <div class="zv-orb zv-float h-64 w-64 top-44 -right-20" style="animation-delay: 1.1s;"></div>

    <?php require __DIR__ . '/includes/navbar.php'; ?>

    <main class="relative z-10 pb-12">
        <section class="zv-section-lg">
            <div class="zv-container px-2 sm:px-3">
                <div class="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div class="zv-hero p-6 sm:p-8">
                        <span class="zv-chip">Premium care experience</span>
                        <h1 class="zv-page-title">Your trusted healthcare store, <span class="zv-gradient-text">designed for confident choices</span>.</h1>
                        <p class="zv-page-lead">Discover medicines, supplements, oral care, skincare, and condition-based health products through a modern shopping journey built for speed and trust.</p>
                        <div class="mt-6 flex flex-wrap gap-3">
                            <a href="shop-category-a.php" class="zv-btn-primary">Explore products</a>
                            <a href="order-tracking.php" class="zv-btn-secondary">Track your order</a>
                        </div>
                        <div class="mt-6 zv-grid-cards cols-3">
                            <div class="zv-card p-4">
                                <strong class="block text-2xl text-navy-900">3000+</strong>
                                <p class="mt-1 text-sm text-slate-600">Products across key categories</p>
                            </div>
                            <div class="zv-card p-4">
                                <strong class="block text-2xl text-navy-900">120+</strong>
                                <p class="mt-1 text-sm text-slate-600">Verified healthcare brands</p>
                            </div>
                            <div class="zv-card p-4">
                                <strong class="block text-2xl text-navy-900">24/7</strong>
                                <p class="mt-1 text-sm text-slate-600">Responsive customer support</p>
                            </div>
                        </div>
                    </div>

                    <div class="zv-panel p-3 sm:p-4">
                        <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                            <img
                                data-hero-rotator
                                data-images="frontend/assets/images/main_page_images/hero.png, frontend/assets/images/main_page_images/1.webp, frontend/assets/images/main_page_images/2.webp, frontend/assets/images/main_page_images/3.webp, frontend/assets/images/main_page_images/4.webp, frontend/assets/images/main_page_images/5.webp, frontend/assets/images/main_page_images/6.webp"
                                src="frontend/assets/images/main_page_images/hero.png"
                                alt="Zovita hero products"
                                class="h-[330px] w-full rounded-lg object-cover transition-opacity duration-300 sm:h-[400px]">
                            <div class="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-navy-900 shadow">Smart category-based discovery</div>
                            <div class="absolute bottom-4 right-4 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white shadow zv-pulse">Secure checkout and protected account flow</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section id="care-by-condition" class="zv-section-lg">
            <div class="zv-container px-2 sm:px-3">
                <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <span class="zv-chip">Care by condition</span>
                        <h2 class="mt-3 text-3xl font-bold">Find relief with targeted care</h2>
                    </div>
                    <a href="shop-category-b.php" class="zv-btn-secondary">Browse condition-focused products</a>
                </div>

                <div class="zv-care-grid">
                    <a href="shop-category-b.php#acne-control" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/acne.png" alt="Acne care">
                        <p>Acne care</p>
                    </a>
                    <a href="shop-category-a.php#pain-relief" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/bones%20%26%20joints%20pain.png" alt="Bones and joints pain care">
                        <p>Bones and joints pain</p>
                    </a>
                    <a href="shop-category-a.php#daily-vitamins" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/constipation.png" alt="Constipation care">
                        <p>Constipation</p>
                    </a>
                    <a href="shop-category-a.php#immunity-support" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/cough%20%26%20cold.png" alt="Cough and cold care">
                        <p>Cough and cold</p>
                    </a>
                    <a href="shop-category-a.php#immunity-support" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/fever%20relief.png" alt="Fever relief care">
                        <p>Fever relief</p>
                    </a>
                    <a href="shop-category-c.php#nutrition-support" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/hairfall.png" alt="Hairfall care">
                        <p>Hairfall</p>
                    </a>
                    <a href="shop-category-a.php#pain-relief" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/pain%20%26%20body%20aches.png" alt="Pain and body aches care">
                        <p>Pain and body aches</p>
                    </a>
                    <a href="shop-category-a.php#daily-vitamins" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/sleep%20disorders.png" alt="Sleep disorders care">
                        <p>Sleep disorders</p>
                    </a>
                    <a href="shop-category-b.php#sun-shield" class="zv-care-item">
                        <img src="frontend/assets/images/care_by_condition/sun%20protection.png" alt="Sun protection care">
                        <p>Sun protection</p>
                    </a>
                </div>
            </div>
        </section>

        <section class="zv-section-lg">
            <div class="zv-container px-2 sm:px-3">
                <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <span class="zv-chip">Featured products</span>
                        <h2 class="mt-3 text-3xl font-bold">Top 15 picks from trusted shelves</h2>
                    </div>
                    <a href="cart.php" class="zv-btn-secondary">Open cart</a>
                </div>

                <div class="zv-product-grid">
                    <?php foreach ($featuredProducts as $product): ?>
                        <article class="zv-product-card zv-product-card-premium">
                            <a href="<?php echo htmlspecialchars($product['url'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-product-link">
                                <div class="zv-product-image-wrap">
                                    <img src="<?php echo htmlspecialchars($product['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8'); ?>">
                                </div>
                                <div class="zv-product-meta">
                                    <small><?php echo htmlspecialchars($product['sectionLabel'], ENT_QUOTES, 'UTF-8'); ?></small>
                                    <strong><?php echo htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8'); ?></strong>
                                    <p class="zv-product-price"><?php echo htmlspecialchars($product['priceLabel'], ENT_QUOTES, 'UTF-8'); ?></p>
                                </div>
                            </a>
                        </article>
                    <?php endforeach; ?>
                </div>
            </div>
        </section>

        <section class="zv-section-lg">
            <div class="zv-container px-2 sm:px-3">
                <div class="grid gap-4 lg:grid-cols-3">
                    <article class="zv-card p-6 zv-shimmer">
                        <span class="zv-chip">Category A</span>
                        <h3 class="mt-3 text-2xl font-bold">Daily wellness and immunity</h3>
                        <p class="mt-2 text-sm text-slate-600">Multivitamins, immunity support, and routine recovery products.</p>
                        <a href="shop-category-a.php" class="zv-btn-secondary mt-4">Explore category A</a>
                    </article>
                    <article class="zv-card p-6 zv-shimmer">
                        <span class="zv-chip">Category B</span>
                        <h3 class="mt-3 text-2xl font-bold">Derma and skin essentials</h3>
                        <p class="mt-2 text-sm text-slate-600">Acne care, pigmentation support, and skin protection ranges.</p>
                        <a href="shop-category-b.php" class="zv-btn-secondary mt-4">Explore category B</a>
                    </article>
                    <article class="zv-card p-6 zv-shimmer">
                        <span class="zv-chip">Category C</span>
                        <h3 class="mt-3 text-2xl font-bold">Oral care and nutrition</h3>
                        <p class="mt-2 text-sm text-slate-600">Oral hygiene, lifestyle supplements, and maintenance essentials.</p>
                        <a href="shop-category-c.php" class="zv-btn-secondary mt-4">Explore category C</a>
                    </article>
                </div>
            </div>
        </section>

        <section class="zv-section">
            <div class="zv-container px-2 sm:px-3">
                <div class="zv-panel p-6 sm:p-8">
                    <div class="grid gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-center">
                        <div>
                            <span class="zv-chip">Newsletter</span>
                            <h2 class="mt-3 text-3xl font-bold">Get wellness tips and new product alerts</h2>
                            <p class="mt-2 text-sm text-slate-600">Subscribe for updates on category launches, seasonal care campaigns, and product highlights.</p>
                        </div>
                        <form data-lite-cooldown class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <label class="zv-label" for="newsletter-email">Email address</label>
                            <input id="newsletter-email" type="email" class="zv-input" placeholder="you@example.com" required>
                            <button type="submit" class="zv-btn-primary mt-4 w-full">Subscribe now</button>
                            <p data-lite-message class="mt-3 hidden rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-navy-800"></p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>