<?php
$pageKey = 'shop-category-c';
$pageTitle = 'Shop Category C | Oral Care, Supplements, and Sensory Care';
$pageDescription = 'Explore Category C on Zovita: oral care products, nutrition supplements, and eyes-nose-ear support essentials.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Shop category C']
];
require __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/products-data.php';

$catalog = zvGetCategoryCatalog();
$category = $catalog['c'];
$products = zvGetProductsByCategory('c');
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="shop-category-c">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8 lg:p-10">
                <span class="zv-chip"><?php echo htmlspecialchars($category['badge'], ENT_QUOTES, 'UTF-8'); ?></span>
                <h1 class="zv-page-title"><?php echo htmlspecialchars($category['title'], ENT_QUOTES, 'UTF-8'); ?></h1>
                <p class="zv-page-lead"><?php echo htmlspecialchars($category['description'], ENT_QUOTES, 'UTF-8'); ?></p>
            </section>

            <section class="zv-section-lg zv-panel p-5 sm:p-6" data-shop-catalog>
                <div class="zv-shop-head">
                    <h2 class="text-2xl font-bold">Premium Catalog</h2>
                    <p class="text-sm font-semibold text-navy-800" data-product-count></p>
                </div>

                <div class="zv-shop-filter-grid mt-4">
                    <label>
                        <span class="zv-label">Search product</span>
                        <input type="search" class="zv-input" data-filter-query placeholder="Search by product name">
                    </label>
                    <div class="zv-filter-dropdown" data-filter-dropdown>
                        <span class="zv-label">Type</span>
                        <button type="button" class="zv-input zv-dropdown-trigger" data-filter-trigger aria-expanded="false">
                            <span data-filter-label>All types</span>
                            <span class="zv-dropdown-arrow">v</span>
                        </button>
                        <ul class="zv-dropdown-list zv-filter-dropdown-list" data-filter-list>
                            <li><button type="button" data-filter-option data-value="all">All types</button></li>
                            <li><button type="button" data-filter-option data-value="product">Product</button></li>
                            <li><button type="button" data-filter-option data-value="medicine">Medicine</button></li>
                        </ul>
                        <input type="hidden" data-filter-type value="all">
                    </div>

                    <div class="zv-filter-dropdown" data-filter-dropdown>
                        <span class="zv-label">Section</span>
                        <button type="button" class="zv-input zv-dropdown-trigger" data-filter-trigger aria-expanded="false">
                            <span data-filter-label>All sections</span>
                            <span class="zv-dropdown-arrow">v</span>
                        </button>
                        <ul class="zv-dropdown-list zv-filter-dropdown-list" data-filter-list>
                            <li><button type="button" data-filter-option data-value="all">All sections</button></li>
                            <?php foreach ($category['sections'] as $section): ?>
                                <li><button type="button" data-filter-option data-value="<?php echo htmlspecialchars($section['id'], ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($section['label'], ENT_QUOTES, 'UTF-8'); ?></button></li>
                            <?php endforeach; ?>
                        </ul>
                        <input type="hidden" data-filter-section value="all">
                    </div>

                    <div class="zv-filter-dropdown" data-filter-dropdown>
                        <span class="zv-label">Sort by</span>
                        <button type="button" class="zv-input zv-dropdown-trigger" data-filter-trigger aria-expanded="false">
                            <span data-filter-label>Featured</span>
                            <span class="zv-dropdown-arrow">v</span>
                        </button>
                        <ul class="zv-dropdown-list zv-filter-dropdown-list" data-filter-list>
                            <li><button type="button" data-filter-option data-value="featured">Featured</button></li>
                            <li><button type="button" data-filter-option data-value="price-low">Price: Low to High</button></li>
                            <li><button type="button" data-filter-option data-value="price-high">Price: High to Low</button></li>
                            <li><button type="button" data-filter-option data-value="name">Name</button></li>
                        </ul>
                        <input type="hidden" data-filter-sort value="featured">
                    </div>
                </div>

                <div class="zv-product-grid mt-5" data-product-grid>
                    <?php foreach ($products as $product): ?>
                        <article
                            class="zv-product-card zv-product-card-premium"
                            data-product-card
                            data-name="<?php echo htmlspecialchars(strtolower($product['name']), ENT_QUOTES, 'UTF-8'); ?>"
                            data-type="<?php echo htmlspecialchars(strtolower($product['type']), ENT_QUOTES, 'UTF-8'); ?>"
                            data-section="<?php echo htmlspecialchars(strtolower($product['section']), ENT_QUOTES, 'UTF-8'); ?>"
                            data-price="<?php echo (int)$product['price']; ?>">
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

                <p class="zv-empty-state" data-empty-state>No products matched your selected filters.</p>
            </section>

            <section class="zv-section">
                <div class="zv-panel p-5 sm:p-6">
                    <h3 class="text-xl font-bold">Need a Specific Product?</h3>
                    <p class="mt-2 text-sm text-slate-600">Use sorting and section filters to quickly locate the right medicine or wellness item in this category.</p>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>