<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cheap first line of defence against abusive requests, before any session, database or view
 * work happens (the expensive part a DoS tries to trigger):
 *
 *  - unexpected HTTP methods                         → 405
 *  - absurdly long URLs or query strings            → 414
 *  - too many query parameters / nested arrays       → 400  (hash-collision & parser abuse)
 *  - bodies larger than the biggest legitimate upload → 413
 *  - NUL bytes anywhere in the input                → 400
 *
 * Volume-based protection (rate limits per IP/route) is layered on top in AppServiceProvider and
 * the route definitions; network-level floods belong at the CDN / load balancer (see deploy/).
 */
class RequestGuard
{
    private const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

    private const MAX_URI = 2048;

    private const MAX_QUERY_PARAMS = 40;

    private const MAX_BODY_BYTES = 12 * 1024 * 1024;

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->getMethod(), self::METHODS, true)) {
            abort(405);
        }
        if (strlen($request->getRequestUri()) > self::MAX_URI) {
            abort(414);
        }
        if (count($request->query->all(), COUNT_RECURSIVE) > self::MAX_QUERY_PARAMS) {
            abort(400, 'Too many parameters.');
        }
        if ((int) $request->server('CONTENT_LENGTH', 0) > self::MAX_BODY_BYTES) {
            abort(413);
        }
        if (str_contains(urldecode($request->getRequestUri()), "\0") || $this->hasNulByte($request->request->all())) {
            abort(400);
        }

        return $next($request);
    }

    private function hasNulByte(array $input, int $depth = 0): bool
    {
        if ($depth > 5) {
            return true; // deeper than any form here: reject
        }
        foreach ($input as $key => $value) {
            if (str_contains((string) $key, "\0")) {
                return true;
            }
            if (is_array($value) ? $this->hasNulByte($value, $depth + 1) : (is_string($value) && str_contains($value, "\0"))) {
                return true;
            }
        }

        return false;
    }
}
