<?php
$pageKey = 'terms-of-service';
$pageTitle = 'Terms of Service | Zovita';
$pageDescription = 'Read Zovita terms of service for account usage, order processing, and platform policy rules.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Terms of service']
];
require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="terms-of-service">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container zv-content px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8">
                <span class="zv-chip">Legal policy</span>
                <h1 class="zv-page-title">Terms of service</h1>
                <p class="zv-page-lead">By using Zovita, you agree to the terms below regarding account usage, order transactions, platform conduct, and policy enforcement.</p>
                <p class="mt-3 text-sm font-semibold text-navy-900">Last updated: <?php echo date('F j, Y'); ?></p>
                <div class="zv-policy-actions">
                    <a href="privacy-policy.php" class="zv-btn-secondary">Privacy policy</a>
                    <a href="returns.php" class="zv-btn-secondary">Returns policy</a>
                    <a href="warranty.php" class="zv-btn-secondary">Warranty policy</a>
                </div>
            </section>

            <section class="zv-section-lg zv-policy-layout">
                <aside class="zv-policy-nav">
                    <h2 class="text-xl font-bold">On this page</h2>
                    <ul>
                        <li><a href="#acceptance">Acceptance of terms</a></li>
                        <li><a href="#account">Account responsibility</a></li>
                        <li><a href="#pricing">Product and pricing data</a></li>
                        <li><a href="#orders">Orders and cancellations</a></li>
                        <li><a href="#usage">Acceptable usage</a></li>
                        <li><a href="#updates">Policy revisions</a></li>
                    </ul>
                </aside>

                <div class="zv-policy-content">
                    <article id="acceptance" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">1. Acceptance of terms</h2>
                        <p class="mt-2 text-sm text-slate-600">Accessing Zovita confirms acceptance of these terms and all related legal policy pages.</p>
                    </article>

                    <article id="account" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">2. Account responsibility</h2>
                        <p class="mt-2 text-sm text-slate-600">Users must protect credentials, keep profile details accurate, and report suspicious account activity immediately.</p>
                    </article>

                    <article id="pricing" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">3. Product and pricing data</h2>
                        <p class="mt-2 text-sm text-slate-600">Product details and pricing are reviewed frequently. Listing inaccuracies can be corrected without prior notice.</p>
                    </article>

                    <article id="orders" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">4. Orders and cancellations</h2>
                        <p class="mt-2 text-sm text-slate-600">Order confirmations remain subject to stock checks, payment verification, and compliance screening.</p>
                    </article>

                    <article id="usage" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">5. Acceptable usage</h2>
                        <p class="mt-2 text-sm text-slate-600">Fraudulent behavior, abuse, scraping misuse, and harmful technical actions are prohibited on the platform.</p>
                    </article>

                    <article id="updates" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">6. Policy revisions</h2>
                        <p class="mt-2 text-sm text-slate-600">Terms may evolve with operations. Continued use after updates means acceptance of revised terms.</p>
                    </article>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>