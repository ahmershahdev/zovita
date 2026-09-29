<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'recaptcha' => [
        'enabled' => (bool) env('RECAPTCHA_ENABLED', true),
        'verify_url' => 'https://www.google.com/recaptcha/api/siteverify',
        'v3' => [
            'site_key' => env('RECAPTCHA_V3_SITE_KEY'),
            'secret_key' => env('RECAPTCHA_V3_SECRET_KEY'),
            'min_score' => (float) env('RECAPTCHA_V3_MIN_SCORE', 0.5),
        ],
        'v2' => [
            'site_key' => env('RECAPTCHA_V2_SITE_KEY'),
            'secret_key' => env('RECAPTCHA_V2_SECRET_KEY'),
        ],
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
