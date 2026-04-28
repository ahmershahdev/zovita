<?php
require_once __DIR__ . '/includes/products-data.php';

$slug = $_GET['slug'] ?? '';
$product = zvFindProductBySlug($slug);

if ($product === null) {
    $allProducts = zvGetAllProducts();
    $product = $allProducts[0] ?? null;
}

if ($product === null) {
    header('Location: index.php');
    exit;
}

$catalog = zvGetCategoryCatalog();
$category = $catalog[$product['categoryKey']];
$relatedProducts = array_values(array_filter(
    zvGetProductsByCategory($product['categoryKey']),
    function ($candidate) use ($product) {
        return $candidate['slug'] !== $product['slug'];
    }
));
$relatedProducts = array_slice($relatedProducts, 0, 8);

$pageKey = 'products';
$pageTitle = $product['name'] . ' | Zovita Product Details';
$pageDescription = 'Explore product details, pricing, and related recommendations for ' . $product['name'] . ' on Zovita.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => $category['badge'], 'url' => $category['page']],
    ['label' => $product['name']]
];

require __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="products">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container px-2 sm:px-3">
            <section class="zv-panel p-6 sm:p-8 lg:p-10">
                <div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                    <div class="zv-product-detail-image-wrap">
                        <img src="<?php echo htmlspecialchars($product['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-product-detail-image">
                    </div>

                    <div>
                        <span class="zv-chip"><?php echo htmlspecialchars($category['badge'], ENT_QUOTES, 'UTF-8'); ?></span>
                        <h1 class="zv-page-title mt-4"><?php echo htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8'); ?></h1>
                        <p class="zv-page-lead"><?php echo htmlspecialchars($product['description'], ENT_QUOTES, 'UTF-8'); ?></p>
                        <div class="mt-4 zv-product-price-lg"><?php echo htmlspecialchars($product['priceLabel'], ENT_QUOTES, 'UTF-8'); ?></div>
                        <div class="mt-5 flex flex-wrap gap-3">
                            <a href="cart.php?add=<?php echo rawurlencode($product['slug']); ?>" class="zv-btn-primary">Add to cart</a>
                            <a href="wishlist.php?add=<?php echo rawurlencode($product['slug']); ?>" class="zv-btn-secondary">Save to wishlist</a>
                        </div>
                        <div class="mt-5 grid gap-3 sm:grid-cols-2">
                            <div class="zv-product-detail-stat">
                                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Type</p>
                                <p class="mt-1 text-sm font-bold text-navy-900"><?php echo htmlspecialchars($product['type'], ENT_QUOTES, 'UTF-8'); ?></p>
                            </div>
                            <div class="zv-product-detail-stat">
                                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section</p>
                                <p class="mt-1 text-sm font-bold text-navy-900"><?php echo htmlspecialchars($product['sectionLabel'], ENT_QUOTES, 'UTF-8'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="zv-section-lg">
                <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <span class="zv-chip">Related products</span>
                        <h2 class="mt-3 text-3xl font-bold">More in <?php echo htmlspecialchars($category['badge'], ENT_QUOTES, 'UTF-8'); ?></h2>
                    </div>
                    <a href="<?php echo htmlspecialchars($category['page'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-btn-secondary">Back to category</a>
                </div>

                <div class="zv-product-grid">
                    <?php foreach ($relatedProducts as $related): ?>
                        <article class="zv-product-card zv-product-card-premium">
                            <a href="<?php echo htmlspecialchars($related['url'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-product-link">
                                <div class="zv-product-image-wrap">
                                    <img src="<?php echo htmlspecialchars($related['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($related['name'], ENT_QUOTES, 'UTF-8'); ?>">
                                </div>
                                <div class="zv-product-meta">
                                    <small><?php echo htmlspecialchars($related['sectionLabel'], ENT_QUOTES, 'UTF-8'); ?></small>
                                    <strong><?php echo htmlspecialchars($related['name'], ENT_QUOTES, 'UTF-8'); ?></strong>
                                    <p class="zv-product-price"><?php echo htmlspecialchars($related['priceLabel'], ENT_QUOTES, 'UTF-8'); ?></p>
                                </div>
                            </a>
                        </article>
                    <?php endforeach; ?>
                </div>
            </section>

            <section class="zv-section">
                <div class="zv-grid-cards cols-3">
                    <a class="zv-card p-5" href="shop-category-a.php">
                        <span class="zv-chip">Category A</span>
                        <h3 class="mt-3 text-xl font-bold">Daily Wellness</h3>
                        <p class="mt-2 text-sm text-slate-600">15 products with prices below PKR 1,500.</p>
                    </a>
                    <a class="zv-card p-5" href="shop-category-b.php">
                        <span class="zv-chip">Category B</span>
                        <h3 class="mt-3 text-xl font-bold">Skin and Derma</h3>
                        <p class="mt-2 text-sm text-slate-600">Acne control, derma repair, and UV protection ranges.</p>
                    </a>
                    <a class="zv-card p-5" href="shop-category-c.php">
                        <span class="zv-chip">Category C</span>
                        <h3 class="mt-3 text-xl font-bold">Oral and Nutrition</h3>
                        <p class="mt-2 text-sm text-slate-600">Oral care, supplements, and eye-ear essentials.</p>
                    </a>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>