<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Flash messages ("Added to your bag") live for exactly one request. Fire-and-forget calls the
 * page makes on its own (dwell/A-B signals, hover prefetches) can land between a redirect and the
 * page that should show the message, and would silently use it up. They keep it for the next
 * real page instead.
 */
class KeepFlashForBackgroundRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $background = $request->routeIs('signals.*', 'search.suggest', 'assistant')
            || strtolower((string) $request->header('Purpose')) === 'prefetch';
        if ($background && $request->hasSession()) {
            $request->session()->reflash();
        }

        return $response;
    }
}
