<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Per-route staff permission (see App\Enums\StaffRole), used after EnsureAdmin:
 *   ->middleware('staff:prescriptions.review')
 * Staff already know the panel exists, so a missing permission is a 403, not a 404.
 */
class EnsureStaffCan
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        abort_unless($request->user()?->canStaff($permission), 403, 'Your role can\'t do this. Ask the owner if you need it.');

        return $next($request);
    }
}
