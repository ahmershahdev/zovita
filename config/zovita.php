<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store identity & support
    |--------------------------------------------------------------------------
    */

    // Public URL used for canonical links, sitemap, robots.txt, llms.txt and structured data.
    'site_url' => env('ZOVITA_SITE_URL', 'https://zovita.ahmershah.dev'),

    // IPs exempt from the site-wide request budget (uptime monitors, LB health checks, load tests).
    'rate_limit_allowlist' => array_values(array_filter(array_map('trim', explode(',', (string) env('RATE_LIMIT_ALLOWLIST', ''))))),

    'support_email' => env('ZOVITA_SUPPORT_EMAIL', 'support@ahmershah.dev'),
    'admin_email' => env('ZOVITA_ADMIN_EMAIL', 'admin@zovita.pk'),
    'support_phone' => env('ZOVITA_SUPPORT_PHONE', '+92 370 4831994'),
    'support_hours' => 'Mon – Sat, 10:00 AM – 8:00 PM',

    // Pharmacy / dispatch location (contact-page map and LocalBusiness structured data).
    'store' => [
        'street' => env('ZOVITA_STORE_STREET', 'Block 5, Clifton'),
        'city' => env('ZOVITA_STORE_CITY', 'Karachi'),
        'postal_code' => env('ZOVITA_STORE_POSTAL', '75600'),
        'lat' => (float) env('ZOVITA_STORE_LAT', 24.8138),
        'lng' => (float) env('ZOVITA_STORE_LNG', 67.0302),
    ],

    /*
    |--------------------------------------------------------------------------
    | Author & source (shown in the footer and contact page)
    |--------------------------------------------------------------------------
    */

    'author' => [
        'name' => 'Syed Ahmer Shah',
        'website' => 'https://ahmershah.dev',
        'linkedin' => 'https://linkedin.com/in/syedahmershah',
        'github' => 'https://github.com/ahmershahdev',
        'source' => 'https://github.com/ahmershahdev/zovita',
    ],

    /*
    |--------------------------------------------------------------------------
    | Checkout
    |--------------------------------------------------------------------------
    | Amounts are in PKR.
    */

    'currency' => 'PKR',
    'delivery_fee' => (int) env('ZOVITA_DELIVERY_FEE', 150),
    'free_delivery_over' => (int) env('ZOVITA_FREE_DELIVERY_OVER', 2500),
    'max_line_quantity' => 20,

    'cities' => [
        'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
        'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot', 'Gujranwala', 'Other',
    ],

    /*
    |--------------------------------------------------------------------------
    | Prescription uploads
    |--------------------------------------------------------------------------
    */

    'prescriptions' => [
        'disk' => 'local',
        'directory' => 'prescriptions',
        'max_kb' => 5120,
        'mimes' => ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Upload virus scanning (App\Services\Security\MalwareScanner)
    |--------------------------------------------------------------------------
    | "clamav" streams every prescription and avatar to clamd (INSTREAM) before it is stored.
    | Set CLAMAV_SOCKET for a Unix socket, otherwise host/port are used. With fail_open=false an
    | unreachable scanner refuses the upload rather than letting an unscanned file through.
    */

    'scanner' => [
        'driver' => env('MALWARE_SCANNER', 'none'),
        'host' => env('CLAMAV_HOST', '127.0.0.1'),
        'port' => (int) env('CLAMAV_PORT', 3310),
        'socket' => env('CLAMAV_SOCKET'),
        'timeout' => (float) env('CLAMAV_TIMEOUT', 10),
        'fail_open' => (bool) env('MALWARE_SCAN_FAIL_OPEN', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Shared stores for abuse controls
    |--------------------------------------------------------------------------
    | Rate-limit counters use config('cache.limiter') (CACHE_LIMITER_STORE) and ban look-ups are
    | cached in BAN_CACHE_STORE. Point both at "redis" when running more than one app server, so
    | every server sees the same counters and the same bans the moment they are issued.
    */

    'bans' => [
        'store' => env('BAN_CACHE_STORE'),
        'ttl' => (int) env('BAN_CACHE_TTL', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | A/B experiments (App\Services\Experiments\Experiments)
    |--------------------------------------------------------------------------
    | Variants are assigned per visitor by hash; results appear in the admin dashboard.
    */

    'experiments' => [
        'hero_cta' => [
            'description' => 'Home hero primary button: browse the shop vs. start from a symptom.',
            'variants' => ['shop', 'symptom'],
        ],
        'card_badge' => [
            'description' => 'Product cards: show the active ingredient on hover vs. always.',
            'variants' => ['hover', 'always'],
        ],
    ],

];
