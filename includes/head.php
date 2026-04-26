<?php
$siteDomain = $siteDomain ?? 'https://zovita.ahmershah.dev';
$pageTitle = $pageTitle ?? 'Zovita | Trusted Healthcare Commerce';
$pageDescription = $pageDescription ?? 'Zovita offers trusted healthcare products, wellness essentials, and support-focused shopping experiences.';
$pageKeywords = $pageKeywords ?? 'zovita, online pharmacy, healthcare, supplements, wellness';
$pageRobots = $pageRobots ?? 'index, follow';

$canonical = $canonical ?? ($siteDomain . '/');
$ogType = $ogType ?? 'website';
$ogTitle = $ogTitle ?? $pageTitle;
$ogDescription = $ogDescription ?? $pageDescription;
$ogImage = $ogImage ?? ($siteDomain . '/frontend/assets/images/main_page_images/hero.png');

$breadcrumbs = $breadcrumbs ?? [['label' => 'Home', 'url' => 'index.php']];

$organizationJsonLd = $organizationJsonLd ?? [
    '@context' => 'https://schema.org',
    '@type' => 'Organization',
    'name' => 'Zovita',
    'url' => $siteDomain,
    'logo' => $siteDomain . '/frontend/assets/images/logo/logo.png'
];

$webPageJsonLd = $webPageJsonLd ?? [
    '@context' => 'https://schema.org',
    '@type' => 'WebPage',
    'name' => $pageTitle,
    'description' => $pageDescription,
    'url' => $canonical
];

if (!isset($breadcrumbListJsonLd)) {
    $breadcrumbListJsonLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => []
    ];

    $position = 1;
    foreach ($breadcrumbs as $crumb) {
        $item = [
            '@type' => 'ListItem',
            'position' => $position,
            'name' => $crumb['label'] ?? ''
        ];

        if (!empty($crumb['url'])) {
            $url = $crumb['url'];
            $item['item'] = (strpos($url, 'http') === 0) ? $url : ($siteDomain . '/' . ltrim($url, '/'));
        }

        $breadcrumbListJsonLd['itemListElement'][] = $item;
        $position++;
    }
}
?>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8'); ?></title>
    <meta name="description" content="<?php echo htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="keywords" content="<?php echo htmlspecialchars($pageKeywords, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="robots" content="<?php echo htmlspecialchars($pageRobots, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="theme-color" content="#0b1f49">

    <meta property="og:type" content="<?php echo htmlspecialchars($ogType, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:title" content="<?php echo htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:url" content="<?php echo htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8'); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8'); ?>">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($ogTitle, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($ogDescription, ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="twitter:image" content="<?php echo htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8'); ?>">

    <link rel="canonical" href="<?php echo htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="icon" type="image/png" href="frontend/assets/images/favicon/favicon.png">

    <link rel="stylesheet" href="frontend/assets/css/dist/tailwind.css">

    <link rel="stylesheet" href="frontend/assets/css/root/variables.css">
    <link rel="stylesheet" href="frontend/assets/css/root/base.css">
    <link rel="stylesheet" href="frontend/assets/css/root/utilities.css">
    <link rel="stylesheet" href="frontend/assets/css/light-mode/layout.css">
    <link rel="stylesheet" href="frontend/assets/css/light-mode/navbar.css">
    <link rel="stylesheet" href="frontend/assets/css/light-mode/suggestions.css">
    <link rel="stylesheet" href="frontend/assets/css/light-mode/pages.css">
    <link rel="stylesheet" href="frontend/assets/css/light-mode/footer.css">
    <link rel="stylesheet" href="frontend/assets/css/dark-mode/dark-mode.css">

    <script type="application/ld+json">
        <?php echo json_encode($organizationJsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>
    </script>
    <script type="application/ld+json">
        <?php echo json_encode($webPageJsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>
    </script>
    <script type="application/ld+json">
        <?php echo json_encode($breadcrumbListJsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>
    </script>
</head>