<?php

if (!function_exists('zvSlugify')) {
    function zvSlugify($value)
    {
        $value = strtolower(trim((string)$value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value);
        return trim((string)$value, '-');
    }
}

if (!function_exists('zvFormatPkr')) {
    function zvFormatPkr($amount)
    {
        return 'PKR ' . number_format((int)$amount);
    }
}

if (!function_exists('zvGetCategoryCatalog')) {
    function zvGetCategoryCatalog()
    {
        static $catalog = null;

        if ($catalog !== null) {
            return $catalog;
        }

        $catalog = [
            'a' => [
                'pageKey' => 'shop-category-a',
                'page' => 'shop-category-a.php',
                'badge' => 'Category A',
                'title' => 'Daily wellness and relief essentials',
                'description' => 'Balanced daily wellness support with vitamins, immunity boosters, and pain-care essentials.',
                'sections' => [
                    ['id' => 'daily-vitamins', 'label' => 'Daily Vitamins'],
                    ['id' => 'immunity-support', 'label' => 'Immunity Support'],
                    ['id' => 'pain-relief', 'label' => 'Pain Relief'],
                ],
            ],
            'b' => [
                'pageKey' => 'shop-category-b',
                'page' => 'shop-category-b.php',
                'badge' => 'Category B',
                'title' => 'Skin, derma, and protection essentials',
                'description' => 'Premium skin routines with acne-care, derma repair products, and daily UV protection support.',
                'sections' => [
                    ['id' => 'acne-control', 'label' => 'Acne Control'],
                    ['id' => 'derma-repair', 'label' => 'Derma Repair'],
                    ['id' => 'sun-shield', 'label' => 'Sun Shield'],
                ],
            ],
            'c' => [
                'pageKey' => 'shop-category-c',
                'page' => 'shop-category-c.php',
                'badge' => 'Category C',
                'title' => 'Oral care, nutrition, and sensory support',
                'description' => 'Everyday oral hygiene, nutrition products, and eye-ear essentials for complete routine care.',
                'sections' => [
                    ['id' => 'oral-care', 'label' => 'Oral Care'],
                    ['id' => 'nutrition-support', 'label' => 'Nutrition Support'],
                    ['id' => 'eye-ear-care', 'label' => 'Eye and Ear Care'],
                ],
            ],
        ];

        return $catalog;
    }
}

if (!function_exists('zvBuildSectionProducts')) {
    function zvBuildSectionProducts($categoryKey, $sectionId, $sectionLabel, $type, array $baseNames, array $variants, $priceStart, $priceStep, array $imagePool)
    {
        $catalog = zvGetCategoryCatalog();
        $products = [];
        $position = 0;

        foreach ($baseNames as $baseIndex => $baseName) {
            foreach ($variants as $variantIndex => $variant) {
                $price = (int)min(1490, $priceStart + ($baseIndex * $priceStep) + ($variantIndex * 29));
                $productName = trim($baseName . ' ' . $variant);
                $slug = zvSlugify($categoryKey . '-' . $sectionId . '-' . $productName);
                $image = $imagePool[$position % count($imagePool)];

                $products[] = [
                    'id' => $categoryKey . '-' . str_pad((string)($position + 1), 2, '0', STR_PAD_LEFT),
                    'slug' => $slug,
                    'name' => $productName,
                    'type' => $type,
                    'categoryKey' => $categoryKey,
                    'categoryBadge' => $catalog[$categoryKey]['badge'],
                    'categoryTitle' => $catalog[$categoryKey]['title'],
                    'categoryPage' => $catalog[$categoryKey]['page'],
                    'section' => $sectionId,
                    'sectionLabel' => $sectionLabel,
                    'price' => $price,
                    'priceLabel' => zvFormatPkr($price),
                    'image' => $image,
                    'description' => 'Premium quality ' . strtolower($sectionLabel) . ' solution for daily care routines and confident results.',
                    'keywords' => strtolower($productName . ' ' . $sectionLabel . ' zovita product medicine'),
                    'url' => 'products.php?slug=' . rawurlencode($slug),
                ];

                $position++;
            }
        }

        return $products;
    }
}

if (!function_exists('zvGetProductsByCategory')) {
    function zvGetProductsByCategory($categoryKey)
    {
        static $cache = [];
        $categoryKey = strtolower((string)$categoryKey);

        if (isset($cache[$categoryKey])) {
            return $cache[$categoryKey];
        }

        $products = [];

        if ($categoryKey === 'a') {
            $images = [
                'frontend/assets/images/multivitamins/Centrum%20Adults%20Multivitamin%20Tablets%20(1%20Bottle%20=%2030%20Tablets).webp',
                'frontend/assets/images/multivitamins/Surbex%20T%20Tablets%20(1%20Bottle%20=%2030%20Tablets).webp',
                'frontend/assets/images/multivitamins/Surbex%20Z%20Tablets%20(1%20Bottle%20=%2030%20Tablets).webp',
                'frontend/assets/images/multivitamins/Cac-1000%20Plus%20Effervescent%20Orange%20Flavor%20Tablets%20(1%20Bottle%20=%2020%20Tablets).webp',
                'frontend/assets/images/multivitamins/Nutrifactor%20Melatonix%20Tablets%205mg%20(1%20Bottle%20=%2030%20Tablets).webp',
            ];

            $products = array_merge(
                zvBuildSectionProducts(
                    'a',
                    'daily-vitamins',
                    'Daily Vitamins',
                    'Product',
                    ['Centrum Daily', 'Surbex Core', 'Nutri Daily', 'Bio Vital', 'Wellness Prime'],
                    ['30 Tablets'],
                    420,
                    63,
                    $images
                ),
                zvBuildSectionProducts(
                    'a',
                    'immunity-support',
                    'Immunity Support',
                    'Product',
                    ['Imuno C Plus', 'Zinc Protect', 'Vita Defend', 'C Shield', 'Resist Forte'],
                    ['20 Tablets'],
                    450,
                    61,
                    $images
                ),
                zvBuildSectionProducts(
                    'a',
                    'pain-relief',
                    'Pain Relief',
                    'Medicine',
                    ['Relief Fast', 'Joint Ease', 'Pain Calm', 'Muscle Care', 'Flex Comfort'],
                    ['20 Tablets'],
                    390,
                    67,
                    $images
                )
            );
        }

        if ($categoryKey === 'b') {
            $images = [
                'frontend/assets/images/derma/Acnes%20Creamy%20Wash%2050g.webp',
                'frontend/assets/images/derma/Acsolve%20Topical%20Lotion%2030ml.webp',
                'frontend/assets/images/derma/Adapco%20Gel%2015g.webp',
                'frontend/assets/images/derma/Eventone-C%20Cream%2030g.webp',
                'frontend/assets/images/derma/Mandelac%20Face%20Wash%20100ml.webp',
            ];

            $products = array_merge(
                zvBuildSectionProducts(
                    'b',
                    'acne-control',
                    'Acne Control',
                    'Medicine',
                    ['Acnes Balance', 'Derma Clear', 'Acno Stop', 'Pore Logic', 'Sebum Care'],
                    ['Gel 15g'],
                    460,
                    64,
                    $images
                ),
                zvBuildSectionProducts(
                    'b',
                    'derma-repair',
                    'Derma Repair',
                    'Product',
                    ['Skin Repair', 'Tone Correct', 'Barrier Boost', 'Hydra Derma', 'Event Glow'],
                    ['Serum 30ml'],
                    520,
                    62,
                    $images
                ),
                zvBuildSectionProducts(
                    'b',
                    'sun-shield',
                    'Sun Shield',
                    'Product',
                    ['Sun Guard', 'UV Block', 'SPF Protect', 'Daily Shield', 'Sun Calm'],
                    ['SPF 50'],
                    490,
                    57,
                    $images
                )
            );
        }

        if ($categoryKey === 'c') {
            $images = [
                'frontend/assets/images/oralcare/Bannet-Z%20Tooth%20Paste%20100g.webp',
                'frontend/assets/images/oralcare/Sensodyne%20Rapid%20Action%20Mint%20Tooth%20Paste%2070g.webp',
                'frontend/assets/images/oralcare/Clinica%20Mouth%20wash%20250ml.webp',
                'frontend/assets/images/supplements/Ensure%20Plus%20Liquid%20250ml.webp',
                'frontend/assets/images/eyes,%20nose,%20ear/Hylo%20Eye%20Drops%200.2%25%205ml.webp',
            ];

            $products = array_merge(
                zvBuildSectionProducts(
                    'c',
                    'oral-care',
                    'Oral Care',
                    'Product',
                    ['Bannet Fresh', 'Sensodyne Rapid', 'Clinica Fresh', 'Enziclor Plus', 'Somo Oral'],
                    ['Paste 100g'],
                    380,
                    58,
                    $images
                ),
                zvBuildSectionProducts(
                    'c',
                    'nutrition-support',
                    'Nutrition Support',
                    'Product',
                    ['Ensure Active', 'Livity Balance', 'Nutri Meal', 'Pro Energy', 'Vita Fuel'],
                    ['250ml Drink'],
                    540,
                    66,
                    $images
                ),
                zvBuildSectionProducts(
                    'c',
                    'eye-ear-care',
                    'Eye and Ear Care',
                    'Medicine',
                    ['Hylo Comfort', 'Softeal Care', 'Lidos Ear', 'Polyfax Eye', 'Clear Vision'],
                    ['Drops 5ml'],
                    410,
                    59,
                    $images
                )
            );
        }

        foreach ($products as $index => $product) {
            $products[$index]['id'] = $categoryKey . '-' . str_pad((string)($index + 1), 3, '0', STR_PAD_LEFT);
        }

        $cache[$categoryKey] = $products;
        return $cache[$categoryKey];
    }
}

if (!function_exists('zvGetAllProducts')) {
    function zvGetAllProducts()
    {
        static $allProducts = null;

        if ($allProducts !== null) {
            return $allProducts;
        }

        $allProducts = array_merge(
            zvGetProductsByCategory('a'),
            zvGetProductsByCategory('b'),
            zvGetProductsByCategory('c')
        );

        return $allProducts;
    }
}

if (!function_exists('zvFindProductBySlug')) {
    function zvFindProductBySlug($slug)
    {
        $slug = zvSlugify((string)$slug);
        if ($slug === '') {
            return null;
        }

        foreach (zvGetAllProducts() as $product) {
            if ($product['slug'] === $slug) {
                return $product;
            }
        }

        return null;
    }
}
