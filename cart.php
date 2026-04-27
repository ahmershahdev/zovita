<?php
$pageKey = 'cart';
$pageTitle = 'Cart | Zovita';
$pageDescription = 'Review selected products, update quantities, and proceed to secure checkout on Zovita.';
$breadcrumbs = [
    ['label' => 'Home', 'url' => 'index.php'],
    ['label' => 'Cart']
];
require __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/includes/products-data.php';
require_once __DIR__ . '/includes/store-state.php';

$defaultQtyPattern = [1, 2, 1, 1];
$defaultCartItems = [];

foreach (array_slice(zvGetAllProducts(), 0, 4) as $index => $item) {
    $defaultCartItems[$item['slug']] = $defaultQtyPattern[$index] ?? 1;
}

zvEnsureSessionCartItems($defaultCartItems);

$addSlug = zvSlugify($_GET['add'] ?? '');
if ($addSlug !== '' && zvFindProductBySlug($addSlug) !== null) {
    zvAddSessionCartItem($addSlug, 1);
    header('Location: cart.php');
    exit;
}

$cartSessionItems = zvGetSessionCartItems();
$cartItems = [];
$qtyDefaults = [];
$normalizedCartItems = [];

foreach ($cartSessionItems as $slug => $quantity) {
    $product = zvFindProductBySlug($slug);
    if ($product === null) {
        continue;
    }

    $cartItems[] = $product;
    $qtyDefaults[] = (int)$quantity;
    $normalizedCartItems[$slug] = (int)$quantity;
}

if ($normalizedCartItems !== $cartSessionItems) {
    zvSetSessionCartItems($normalizedCartItems);
}
?>
<!DOCTYPE html>
<html lang="en">
<?php require __DIR__ . '/includes/head.php'; ?>

<body class="zv-shell" data-page="cart">
    <?php require __DIR__ . '/includes/navbar.php'; ?>
    <?php require __DIR__ . '/includes/breadcrumbs.php'; ?>

    <main class="zv-section-lg pb-12">
        <div class="zv-container px-2 sm:px-3">
            <section class="zv-hero p-6 sm:p-8 lg:p-10">
                <span class="zv-chip">Your cart</span>
                <h1 class="zv-page-title">Ready to complete your order?</h1>
                <p class="zv-page-lead">Review selected products, adjust quantity, and proceed to secure payment.</p>
            </section>

            <section class="zv-section-lg grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" data-cart-root>
                <article class="zv-panel p-6 sm:p-8" data-cart-list>
                    <h2 class="text-2xl font-bold">Cart items</h2>
                    <div class="mt-4 space-y-3">
                        <?php foreach ($cartItems as $index => $item): ?>
                            <div
                                class="zv-cart-item"
                                data-cart-item
                                data-product-slug="<?php echo htmlspecialchars($item['slug'], ENT_QUOTES, 'UTF-8'); ?>"
                                data-price="<?php echo (int)$item['price']; ?>">
                                <a href="<?php echo htmlspecialchars($item['url'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-cart-item-image">
                                    <img src="<?php echo htmlspecialchars($item['image'], ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8'); ?>">
                                </a>
                                <div class="zv-cart-item-content">
                                    <a href="<?php echo htmlspecialchars($item['url'], ENT_QUOTES, 'UTF-8'); ?>" class="zv-cart-item-title"><?php echo htmlspecialchars($item['name'], ENT_QUOTES, 'UTF-8'); ?></a>
                                    <p class="zv-cart-item-meta"><?php echo htmlspecialchars($item['sectionLabel'], ENT_QUOTES, 'UTF-8'); ?></p>
                                    <p class="zv-cart-item-line-price" data-line-price><?php echo htmlspecialchars(zvFormatPkr($item['price'] * $qtyDefaults[$index]), ENT_QUOTES, 'UTF-8'); ?></p>
                                </div>
                                <div class="zv-qty-control">
                                    <button type="button" data-qty-decrease aria-label="Decrease quantity">-</button>
                                    <span data-qty-value><?php echo (int)$qtyDefaults[$index]; ?></span>
                                    <button type="button" data-qty-increase aria-label="Increase quantity">+</button>
                                </div>
                                <button type="button" class="zv-remove-btn" data-remove-item>Remove</button>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <p class="zv-empty-state mt-4" data-cart-empty>Your cart is empty. Add products to continue checkout.</p>
                </article>

                <article class="zv-panel p-6 sm:p-8">
                    <h2 class="text-2xl font-bold">Order summary</h2>
                    <div class="mt-4">
                        <label class="zv-label" for="cart-coupon">Coupon code</label>
                        <div class="zv-coupon-wrap">
                            <input id="cart-coupon" class="zv-input" type="text" data-coupon-input placeholder="Try ZOVITA10 or SAVE150">
                            <button type="button" class="zv-btn-secondary" data-coupon-apply>Apply</button>
                        </div>
                        <p class="zv-coupon-message" data-coupon-message></p>
                    </div>

                    <div class="mt-4 space-y-2 text-sm text-slate-700">
                        <div class="flex justify-between"><span>Subtotal</span><strong data-summary-subtotal>PKR 0</strong></div>
                        <div class="flex justify-between"><span>Shipping</span><strong data-summary-shipping>PKR 0</strong></div>
                        <div class="flex justify-between"><span>Discount</span><strong data-summary-discount>-PKR 0</strong></div>
                        <div class="flex justify-between border-t border-slate-200 pt-2 text-base"><span>Total</span><strong data-summary-total>PKR 0</strong></div>
                    </div>
                    <a href="#" class="zv-btn-primary mt-5 w-full">Proceed to checkout</a>
                    <a href="shop-category-a.php" class="zv-btn-secondary mt-3 w-full">Continue shopping</a>
                </article>
            </section>
        </div>
    </main>

    <?php require __DIR__ . '/includes/footer.php'; ?>
    <?php require __DIR__ . '/includes/scripts.php'; ?>
</body>

</html>