<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // Nonce for the inline theme script, Ziggy routes and Vite tags (see app.blade.php).
        $csp = ! app()->environment('local') && ! Vite::isRunningHot();
        if ($csp) {
            Vite::useCspNonce();
        }

        $response = $next($request);

        if (function_exists('header_remove')) {
            header_remove('X-Powered-By');
        }
        $response->headers->remove('X-Powered-By');

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');

        if ($csp && str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            $nonce = Vite::cspNonce();
            $google = 'https://www.google.com https://www.gstatic.com';
            $response->headers->set('Content-Security-Policy', implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'nonce-{$nonce}' {$google}",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https://dvago-assets.s3.ap-southeast-1.amazonaws.com",
                "font-src 'self' data:",
                "connect-src 'self'",
                "frame-src {$google}",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
            ]));
        }

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
