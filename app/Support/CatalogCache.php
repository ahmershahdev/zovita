<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Cache for catalog-derived data (home rails, nav, price stats…). Keys are namespaced by a catalog
 * version, so a single flush() after an import invalidates everything at once, on any cache driver
 * (no tag support needed).
 */
final class CatalogCache
{
    private const VERSION_KEY = 'catalog.version';

    public static function remember(string $key, \DateTimeInterface|int $ttl, Closure $callback): mixed
    {
        return Cache::remember(self::key($key), $ttl, $callback);
    }

    public static function flush(): void
    {
        Cache::forever(self::VERSION_KEY, self::version() + 1);
    }

    private static function key(string $key): string
    {
        // Cached payloads contain absolute asset URLs, so each host (www/apex, staging) gets its own copy.
        return 'catalog.'.self::version().'.'.substr(md5(url('/')), 0, 8).'.'.$key;
    }

    private static function version(): int
    {
        return (int) Cache::rememberForever(self::VERSION_KEY, fn () => 1);
    }
}
