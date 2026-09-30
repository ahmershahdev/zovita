<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Store identity & support
    |--------------------------------------------------------------------------
    */

    'support_email' => env('ZOVITA_SUPPORT_EMAIL', 'support@ahmershah.dev'),
    'admin_email' => env('ZOVITA_ADMIN_EMAIL', 'admin@zovita.pk'),
    'support_phone' => env('ZOVITA_SUPPORT_PHONE', '+92 370 4831994'),
    'support_hours' => 'Mon – Sat, 10:00 AM – 8:00 PM PKT',

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

];
