<?php

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!function_exists('zvNormalizeSlugList')) {
    function zvNormalizeSlugList(array $values)
    {
        $normalized = [];

        foreach ($values as $value) {
            $raw = trim((string)$value);
            if ($raw === '') {
                continue;
            }

            $slug = function_exists('zvSlugify')
                ? zvSlugify($raw)
                : preg_replace('/[^a-z0-9]+/', '-', strtolower($raw));

            $slug = trim((string)$slug, '-');
            if ($slug === '') {
                continue;
            }

            if (!in_array($slug, $normalized, true)) {
                $normalized[] = $slug;
            }
        }

        return $normalized;
    }
}

if (!function_exists('zvNormalizeCartItems')) {
    function zvNormalizeCartItems(array $items)
    {
        $normalized = [];

        foreach ($items as $slug => $qty) {
            if (is_int($slug)) {
                $slug = $qty;
                $qty = 1;
            }

            $cleanSlugList = zvNormalizeSlugList([(string)$slug]);
            if ($cleanSlugList === []) {
                continue;
            }

            $cleanSlug = $cleanSlugList[0];
            $cleanQty = (int)$qty;

            if ($cleanQty < 1) {
                continue;
            }

            if (isset($normalized[$cleanSlug])) {
                $normalized[$cleanSlug] += $cleanQty;
            } else {
                $normalized[$cleanSlug] = $cleanQty;
            }
        }

        return $normalized;
    }
}

if (!function_exists('zvGetSessionWishlistSlugs')) {
    function zvGetSessionWishlistSlugs()
    {
        $current = $_SESSION['zv_wishlist_slugs'] ?? [];
        return is_array($current) ? zvNormalizeSlugList($current) : [];
    }
}

if (!function_exists('zvSetSessionWishlistSlugs')) {
    function zvSetSessionWishlistSlugs(array $slugs)
    {
        $_SESSION['zv_wishlist_slugs'] = zvNormalizeSlugList($slugs);
        return $_SESSION['zv_wishlist_slugs'];
    }
}

if (!function_exists('zvEnsureSessionWishlistSlugs')) {
    function zvEnsureSessionWishlistSlugs(array $defaultSlugs)
    {
        if (!array_key_exists('zv_wishlist_slugs', $_SESSION) || !is_array($_SESSION['zv_wishlist_slugs'])) {
            return zvSetSessionWishlistSlugs($defaultSlugs);
        }

        return zvSetSessionWishlistSlugs($_SESSION['zv_wishlist_slugs']);
    }
}

if (!function_exists('zvRemoveSessionWishlistSlugs')) {
    function zvRemoveSessionWishlistSlugs(array $slugs)
    {
        $toRemove = zvNormalizeSlugList($slugs);
        if ($toRemove === []) {
            return zvGetSessionWishlistSlugs();
        }

        $next = array_values(array_filter(
            zvGetSessionWishlistSlugs(),
            function ($slug) use ($toRemove) {
                return !in_array($slug, $toRemove, true);
            }
        ));

        return zvSetSessionWishlistSlugs($next);
    }
}

if (!function_exists('zvGetSessionCartItems')) {
    function zvGetSessionCartItems()
    {
        $current = $_SESSION['zv_cart_items'] ?? [];
        return is_array($current) ? zvNormalizeCartItems($current) : [];
    }
}

if (!function_exists('zvSetSessionCartItems')) {
    function zvSetSessionCartItems(array $items)
    {
        $_SESSION['zv_cart_items'] = zvNormalizeCartItems($items);
        return $_SESSION['zv_cart_items'];
    }
}

if (!function_exists('zvEnsureSessionCartItems')) {
    function zvEnsureSessionCartItems(array $defaultItems)
    {
        if (!array_key_exists('zv_cart_items', $_SESSION) || !is_array($_SESSION['zv_cart_items'])) {
            return zvSetSessionCartItems($defaultItems);
        }

        return zvSetSessionCartItems($_SESSION['zv_cart_items']);
    }
}

if (!function_exists('zvAddSessionCartItem')) {
    function zvAddSessionCartItem($slug, $quantity = 1)
    {
        $slugList = zvNormalizeSlugList([(string)$slug]);
        if ($slugList === []) {
            return zvGetSessionCartItems();
        }

        $cleanSlug = $slugList[0];
        $qty = max(1, (int)$quantity);
        $items = zvGetSessionCartItems();

        if (isset($items[$cleanSlug])) {
            $items[$cleanSlug] += $qty;
        } else {
            $items[$cleanSlug] = $qty;
        }

        return zvSetSessionCartItems($items);
    }
}
