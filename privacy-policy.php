<?php
$pageKey = 'privacy-policy';
$pageTitle = 'Privacy Policy | Zovita';
$pageDescription = 'Review how Zovita collects, processes, secures, and uses customer data across the platform.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Privacy policy']
];
require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="privacy-policy">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container zv-content px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8">
                <span class="zv-chip">Legal policy</span>
                <h1 class="zv-page-title">Privacy policy</h1>
                <p class="zv-page-lead">This policy explains what data Zovita collects, how it is used, and what controls protect customer privacy across account and order workflows.</p>
                <p class="mt-3 text-sm font-semibold text-navy-900">Last updated: <?php echo date('F j, Y'); ?></p>
                <div class="zv-policy-actions">
                    <a href="terms-of-service.php" class="zv-btn-secondary">Terms of service</a>
                    <a href="returns.php" class="zv-btn-secondary">Returns policy</a>
                    <a href="warranty.php" class="zv-btn-secondary">Warranty policy</a>
                </div>
            </section>

            <section class="zv-section-lg zv-policy-layout">
                <aside class="zv-policy-nav">
                    <h2 class="text-xl font-bold">On this page</h2>
                    <ul>
                        <li><a href="#collect">Data we collect</a></li>
                        <li><a href="#usage">Data usage</a></li>
                        <li><a href="#sharing">Sharing controls</a></li>
                        <li><a href="#security">Security standards</a></li>
                        <li><a href="#rights">User rights</a></li>
                        <li><a href="#updates">Policy updates</a></li>
                    </ul>
                </aside>

                <div class="zv-policy-content">
                    <article id="collect" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">1. Data we collect</h2>
                        <p class="mt-2 text-sm text-slate-600">We collect account details, contact information, order metadata, and support records required for service operations.</p>
                    </article>

                    <article id="usage" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">2. Data usage</h2>
                        <p class="mt-2 text-sm text-slate-600">Information is used for order processing, account security, service delivery, and quality improvements.</p>
                    </article>

                    <article id="sharing" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">3. Sharing controls</h2>
                        <p class="mt-2 text-sm text-slate-600">Data is only shared with required operational partners such as payment processors and logistics providers.</p>
                    </article>

                    <article id="security" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">4. Security standards</h2>
                        <p class="mt-2 text-sm text-slate-600">Zovita applies practical safeguards to reduce unauthorized access risk and maintain platform integrity.</p>
                    </article>

                    <article id="rights" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">5. User rights</h2>
                        <p class="mt-2 text-sm text-slate-600">Users may request profile corrections and policy clarifications through our official support channels.</p>
                    </article>

                    <article id="updates" class="zv-policy-card">
                        <h2 class="text-2xl font-bold">6. Policy updates</h2>
                        <p class="mt-2 text-sm text-slate-600">Policy updates are published on this page and become effective on the posted date.</p>
                    </article>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>