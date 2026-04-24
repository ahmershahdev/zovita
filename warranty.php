<?php
$pageKey = 'warranty';
$pageTitle = 'Warranty Policy | Zovita';
$pageDescription = 'View warranty coverage guidance for eligible Zovita products and claim support steps.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Warranty policy']
];
require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="warranty">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container zv-content px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8">
                <span class="zv-chip">Support policy</span>
                <h1 class="zv-page-title">Warranty policy</h1>
                <p class="zv-page-lead">Some product categories include manufacturer-backed coverage. This page explains eligibility, required proof, and review expectations.</p>
                <p class="mt-3 text-sm font-semibold text-navy-900">Last updated: <?php echo date('F j, Y'); ?></p>
                <div class="zv-policy-actions">
                    <a href="returns.php" class="zv-btn-secondary">Returns policy</a>
                    <a href="terms-of-service.php" class="zv-btn-secondary">Terms of service</a>
                    <a href="privacy-policy.php" class="zv-btn-secondary">Privacy policy</a>
                </div>
            </section>

            <section class="zv-section-lg zv-policy-layout">
                <aside class="zv-policy-nav">
                    <h2 class="text-xl font-bold">On this page</h2>
                    <ul>
                        <li><a href="#eligible">Eligible products</a></li>
                        <li><a href="#claim-details">Required claim details</a></li>
                        <li><a href="#exclusions">Exclusions</a></li>
                        <li><a href="#review">Review timeline</a></li>
                        <li><a href="#resolution">Resolution options</a></li>
                    </ul>
                </aside>

                <div class="zv-policy-content">
                    <article id="eligible" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">1. Eligible products</h2>
                        <p class="mt-2 text-sm text-slate-600">Warranty applies only to items clearly marked as warranty-covered by manufacturer or supplier terms.</p>
                    </article>

                    <article id="claim-details" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">2. Required claim details</h2>
                        <p class="mt-2 text-sm text-slate-600">Order proof, invoice details, issue description, and product images are required for efficient review.</p>
                    </article>

                    <article id="exclusions" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">3. Exclusions</h2>
                        <p class="mt-2 text-sm text-slate-600">Misuse, unauthorized modifications, accidental damage, and expiry-related conditions are generally excluded.</p>
                    </article>

                    <article id="review" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">4. Review timeline</h2>
                        <p class="mt-2 text-sm text-slate-600">Claims are typically reviewed within 2 to 4 business days after complete documentation is submitted.</p>
                    </article>

                    <article id="resolution" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">5. Resolution options</h2>
                        <p class="mt-2 text-sm text-slate-600">Approved cases may be resolved through replacement, service support, or other policy-backed outcomes.</p>
                    </article>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>