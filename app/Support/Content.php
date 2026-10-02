<?php

namespace App\Support;

/**
 * Editorial content shared between the React pages and the server (structured data, llms.txt):
 * resources/content/faq.json and resources/content/legal.json.
 */
final class Content
{
    private static array $cache = [];

    public static function faq(): array
    {
        return self::$cache['faq'] ??= json_decode((string) file_get_contents(resource_path('content/faq.json')), true) ?: [];
    }

    public static function legal(): array
    {
        return self::$cache['legal'] ??= json_decode((string) file_get_contents(resource_path('content/legal.json')), true) ?: ['pages' => [], 'nav' => []];
    }

    /** Replaces {email}, {phone}, {hours}, {free} and {fee} with live store config. */
    public static function filler(): callable
    {
        $values = [
            '{email}' => (string) config('zovita.support_email'),
            '{phone}' => (string) config('zovita.support_phone'),
            '{hours}' => (string) config('zovita.support_hours'),
            '{free}' => 'PKR '.number_format((int) config('zovita.free_delivery_over')),
            '{fee}' => 'PKR '.number_format((int) config('zovita.delivery_fee')),
        ];

        return fn (?string $text) => $text === null ? null : strtr($text, $values);
    }
}
