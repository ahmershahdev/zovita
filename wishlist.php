<?php
$pageKey = 'wishlist';
$pageTitle = 'Wishlist | Zovita';
$pageDescription = 'Save your favorite Zovita products and organize future healthcare purchases in one place.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Wishlist']
];
require __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/products-data.php';
require_once __DIR__ . '/includes/store-state.php';

$defaultWishlistSlugs = array_map(
    static function ($product) {
        return $product['slug'];
    },
    array_slice(zvGetAllProducts(), 8, 9)
);

zvEnsureSessionWishlistSlugs($defaultWishlistSlugs);

$addSlug = zvSlugify($_GET['add'] ?? '');
if ($addSlug !== '' && zvFindProductBySlug($addSlug) !== null) {
    $wishlistSlugs = zvGetSessionWishlistSlugs();
    $wishlistSlugs[] = $addSlug;
    zvSetSessionWishlistSlugs($wishlistSlugs);

    header('Location: wishlist.php');
    exit;
}

$removeParam = trim((string)($_GET['remove'] ?? ''));
if ($removeParam !== '') {
    $removeSlugs = zvNormalizeSlugList(explode(',', $removeParam));
    if ($removeSlugs !== []) {
        zvRemoveSessionWishlistSlugs($removeSlugs);
    }

    header('Location: wishlist.php');
    exit;
}

$wishlistItems = [];
foreach (zvGetSessionWishlistSlugs() as $slug) {
    $item = zvFindProductBySlug($slug);
    if ($item !== null) {
        $wishlistItems[] = $item;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="wishlist">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8 lg:p-10">
                <span class="zv-chip">Saved products</span>
                <h1 class="zv-page-title">Your wishlist</h1>
                <p class="zv-page-lead">Keep important products ready for quick access, reordering, and cart movement.</p>
            </section>

            <section class="zv-section-lg" data-wishlist-root>
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-navy-800" data-wishlist-count></p>
                    <button type="button" class="zv-btn-secondary" data-remove-selected>Remove selected</button>
                </div>

                <div class="zv-product-grid mt-4">
                    <?php foreach ($wishlistItems as $item): ?>
                        <article
                            class="zv-product-card zv-product-card-premium"
                            data-wishlist-item
                            data-product-slug="<?php echo htmlspecialchars($item['slug'], ENT_QUOTES, 'UTF-8'); ?>">
                            <label class="zv-select-item-label">
                                <input type="checkbox" data-select-item>
                                <span>Select</span>
                            </label>
                            <a href="<?php echo htmlspecialchars($item['url'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-product-link">
                                <div class="zv-product-image-wrap">
                                    <img src="<?php echo htmlspecialchars($item['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8'); ?>">
                                </div>
                                <div class="zv-product-meta">
                                    <small><?php echo htmlspecialchars($item['sectionLabel'], ENT_QUOTES, 'UTF-8'); ?></small>
                                    <strong><?php echo htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8'); ?></strong>
                                    <p class="zv-product-price"><?php echo htmlspecialchars($item['priceLabel'], ENT_QUOTES, 'UTF-8'); ?></p>
                                </div>
                            </a>
                            <div class="mt-3 grid gap-2 sm:grid-cols-2">
                                <a href="cart.php?add=<?php echo rawurlencode($item['slug']); ?>" class="zv-btn-primary">Add to cart</a>
                                <a href="wishlist.php?remove=<?php echo rawurlencode($item['slug']); ?>" class="zv-remove-btn" data-remove-item>Remove</a>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>

                <p class="zv-empty-state mt-4" data-wishlist-empty>Your wishlist is empty. Save products to view them here.</p>

                <div class="mt-5 flex flex-wrap gap-3">
                    <a href="cart.php" class="zv-btn-primary">Move selected to cart</a>
                    <a href="shop-category-b.php" class="zv-btn-secondary">Browse more products</a>
                </div>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>