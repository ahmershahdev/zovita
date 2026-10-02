<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the interface language: `?lang=ur|en` (shareable/hreflang links) → the `zv_locale`
 * cookie → the signed-in customer's saved preference → English. Urdu switches the document to
 * right-to-left (see app.blade.php and the `rtl:` styles).
 */
class SetLocale
{
    public const LOCALES = ['en' => 'English', 'ur' => 'اردو'];

    public const COOKIE = 'zv_locale';

    public function handle(Request $request, Closure $next): Response
    {
        $fromQuery = $request->query('lang');
        $locale = match (true) {
            is_string($fromQuery) && isset(self::LOCALES[$fromQuery]) => $fromQuery,
            isset(self::LOCALES[(string) $request->cookie(self::COOKIE)]) => (string) $request->cookie(self::COOKIE),
            isset(self::LOCALES[(string) ($request->user()?->getAttributes()['locale'] ?? '')]) => $request->user()->getAttributes()['locale'],
            default => 'en',
        };

        App::setLocale($locale);
        if (is_string($fromQuery) && isset(self::LOCALES[$fromQuery])) {
            Cookie::queue(Cookie::make(self::COOKIE, $locale, 60 * 24 * 365, httpOnly: false, sameSite: 'lax'));
        }

        return $next($request);
    }

    public static function dir(?string $locale = null): string
    {
        return ($locale ?? App::getLocale()) === 'ur' ? 'rtl' : 'ltr';
    }
}
