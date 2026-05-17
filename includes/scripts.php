<?php
$pageKey = $pageKey ?? 'default';
$isAuthPage = in_array($pageKey, ['login', 'signup', 'forgot-password'], true);
$isShopCategoryPage = in_array($pageKey, ['shop-category-a', 'shop-category-b', 'shop-category-c'], true);
?>

<script src="frontend/assets/js/core/navigation.js"></script>
<script src="frontend/assets/js/features/search.js"></script>
<script src="frontend/assets/js/features/scroll-top.js"></script>
<script src="frontend/assets/js/features/form-cooldown.js"></script>

<?php if ($pageKey === 'home'): ?>
    <script src="frontend/assets/js/pages/home.js"></script>
<?php endif; ?>

<?php if ($isShopCategoryPage): ?>
    <script src="frontend/assets/js/pages/shop.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'cart'): ?>
    <script src="frontend/assets/js/pages/cart.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'wishlist'): ?>
    <script src="frontend/assets/js/pages/wishlist.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'contact'): ?>
    <script src="frontend/assets/js/pages/contact.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'account'): ?>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>
    <script src="frontend/assets/js/pages/account.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'about'): ?>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="frontend/assets/js/pages/about.js"></script>
<?php endif; ?>

<?php if ($pageKey === 'products'): ?>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="frontend/assets/js/pages/product.js"></script>
<?php endif; ?>

<?php if ($isAuthPage): ?>
    <script src="frontend/assets/js/auth/forms.js"></script>
<?php endif; ?>

<script src="frontend/assets/js/app.js"></script>