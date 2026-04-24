<?php
$pageKey = 'returns';
$pageTitle = 'Returns and Refund Policy | Zovita';
$pageDescription = 'Learn Zovita return and refund rules, eligibility conditions, and request timelines.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Returns and refund']
];
require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="returns">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container zv-content px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8">
                <span class="zv-chip">Support policy</span>
                <h1 class="zv-page-title">Returns and refund policy</h1>
                <p class="zv-page-lead">We aim for transparent and fair return handling. This page explains return eligibility, restrictions, and refund processing expectations.</p>
                <p class="mt-3 text-sm font-semibold text-navy-900">Last updated: <?php echo date('F j, Y'); ?></p>
                <div class="zv-policy-actions">
                    <a href="warranty.php" class="zv-btn-secondary">Warranty policy</a>
                    <a href="terms-of-service.php" class="zv-btn-secondary">Terms of service</a>
                    <a href="privacy-policy.php" class="zv-btn-secondary">Privacy policy</a>
                </div>
            </section>

            <section class="zv-section-lg zv-policy-layout">
                <aside class="zv-policy-nav">
                    <h2 class="text-xl font-bold">On this page</h2>
                    <ul>
                        <li><a href="#window">Return request window</a></li>
                        <li><a href="#condition">Product condition</a></li>
                        <li><a href="#excluded">Non-returnable categories</a></li>
                        <li><a href="#timeline">Refund timeline</a></li>
                        <li><a href="#damaged">Damaged or incorrect delivery</a></li>
                    </ul>
                </aside>

                <div class="zv-policy-content">
                    <article id="window" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">1. Return request window</h2>
                        <p class="mt-2 text-sm text-slate-600">Return requests should be raised within the approved timeline from the delivery date.</p>
                    </article>

                    <article id="condition" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">2. Product condition</h2>
                        <p class="mt-2 text-sm text-slate-600">Items should remain in acceptable condition with original packaging and invoice details where applicable.</p>
                    </article>

                    <article id="excluded" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">3. Non-returnable categories</h2>
                        <p class="mt-2 text-sm text-slate-600">Certain hygiene-sensitive, consumable, and special-handling products may be excluded from return.</p>
                    </article>

                    <article id="timeline" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">4. Refund timeline</h2>
                        <p class="mt-2 text-sm text-slate-600">Approved refunds are processed according to payment channel timelines and verification requirements.</p>
                    </article>

                    <article id="damaged" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">5. Incorrect or damaged delivery</h2>
                        <p class="mt-2 text-sm text-slate-600">Report issues quickly with order ID and image proof to receive fast support resolution.</p>
                    </article>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>