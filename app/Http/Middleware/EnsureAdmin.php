<?php

namespace App\Http\Middleware;

use App\Services\Security\PendingLogin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin area gate.
 *  - anyone who isn't a signed-in, non-banned admin gets a plain 404: the panel's existence isn't
 *    advertised (no redirect to a login page, no "forbidden")
 *  - staff sessions end after IDLE_MINUTES without activity; the next request goes to the staff
 *    sign-in
 */
class EnsureAdmin
{
    public const IDLE_MINUTES = 30;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user?->isAdmin(), 404);

        // Mandatory two-step sign-in: a staff session only counts once this browser passed the
        // second step for this account (a password alone, or a remember-me cookie, is not enough).
        if (! $user->hasTwoFactor() || $request->session()->get(PendingLogin::VERIFIED) !== $user->id) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')->with('error', 'Please sign in again with your two-step code.');
        }

        $last = (int) $request->session()->get('admin_last_active', 0);
        if ($last && now()->timestamp - $last > self::IDLE_MINUTES * 60) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')->with('error', 'For safety you were signed out after '.self::IDLE_MINUTES.' minutes of inactivity.');
        }
        $request->session()->put('admin_last_active', now()->timestamp);

        $response = $next($request);
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
