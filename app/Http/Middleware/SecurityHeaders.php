<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers on every response, and a strict, nonce-based Content Security Policy on HTML.
 *
 * Scripts run only if they come from this origin or carry the per-request nonce (Vite tags, Ziggy
 * routes, the theme bootstrap) — injected markup can't execute. Third parties are limited to what
 * the site really uses: Google reCAPTCHA and the OpenStreetMap embed on the contact page.
 * `style-src 'unsafe-inline'` remains because React writes inline style attributes for animation;
 * styles can't execute script, so this doesn't weaken XSS protection.
 */
class SecurityHeaders
{
    private const RECAPTCHA_SCRIPTS = 'https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/';

    private const RECAPTCHA_FRAMES = 'https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/';

    private const MAP_FRAMES = 'https://www.openstreetmap.org';

    public function handle(Request $request, Closure $next): Response
    {
        // The Vite dev server injects un-nonced HMR scripts; CSP applies everywhere else.
        $csp = ! Vite::isRunningHot();
        if ($csp) {
            Vite::useCspNonce();
        }

        $response = $next($request);

        if (function_exists('header_remove')) {
            header_remove('X-Powered-By');
        }
        $headers = $response->headers;
        $headers->remove('X-Powered-By');
        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'SAMEORIGIN');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()');
        $headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $headers->set('Cross-Origin-Resource-Policy', 'same-site');
        $headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        if ($csp && str_contains((string) $headers->get('Content-Type'), 'text/html') && ! $headers->has('Content-Security-Policy')) {
            $nonce = Vite::cspNonce();
            $directives = [
                "default-src 'self'",
                "script-src 'self' 'nonce-{$nonce}' ".self::RECAPTCHA_SCRIPTS,
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https://tile.openstreetmap.org",
                "font-src 'self' data:",
                "connect-src 'self' https://nominatim.openstreetmap.org",
                'frame-src '.self::RECAPTCHA_FRAMES.' '.self::MAP_FRAMES,
                "worker-src 'self' blob:",
                "media-src 'self'",
                "manifest-src 'self'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
            ];
            if ($request->isSecure()) {
                $directives[] = 'upgrade-insecure-requests';
            }
            $headers->set('Content-Security-Policy', implode('; ', $directives));
        }

        if ($request->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        }

        // Personalised and account pages must never be stored by shared caches/CDNs.
        if ($request->user() && ! $headers->has('Cache-Control')) {
            $headers->set('Cache-Control', 'private, no-store');
        }

        return $response;
    }
}
