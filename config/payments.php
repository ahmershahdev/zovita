<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Online payments (card) alongside cash on delivery
    |--------------------------------------------------------------------------
    | driver:   "sandbox" — a built-in hosted test page (local/dev/testing only, refused in production)
    |           "stripe"  — Stripe Checkout + webhooks + refunds (PKR)
    |           "none"    — cash on delivery only
    | Card orders reserve their stock for `expires_minutes`; unpaid ones are cancelled and restocked
    | by `payments:expire` (scheduled every 5 minutes). A payment that arrives after that is refunded.
    */

    'driver' => env('PAYMENTS_DRIVER', 'sandbox'),

    'currency' => 'PKR',

    'expires_minutes' => (int) env('PAYMENTS_EXPIRES_MINUTES', 30),

    'sandbox' => [
        // Signs the sandbox page's webhook exactly the way Stripe signs real ones.
        'webhook_secret' => env('PAYMENTS_SANDBOX_SECRET', 'whsec_sandbox_local_only'),
    ],

    'stripe' => [
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'api' => 'https://api.stripe.com/v1',
    ],

    // Seconds a signed webhook stays valid (replay protection).
    'webhook_tolerance' => 300,
];
