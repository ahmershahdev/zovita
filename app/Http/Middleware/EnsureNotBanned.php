<?php

namespace App\Http\Middleware;

use App\Services\Security\BanGuard;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ban enforcement on every web request:
 *  - a banned account is signed out at once (even mid-session) and sent to the suspension page;
 *    temporary bans clear themselves when they expire
 *  - a deep ban blocks its IP address, network range, device and browser fingerprint from the whole
 *    site, signed in or not (policies and the suspension page stay reachable)
 * Also records when signed-in customers were last active.
 */
class EnsureNotBanned
{
    private const ALWAYS_ALLOWED = ['suspended', 'legal', 'robots', 'sitemap', 'llms', 'llms.full'];

    public function __construct(private readonly BanGuard $guard) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! empty($user->getAttributes()['banned_at'] ?? null) && ! $user->isBanned()) {
            // A temporary ban that has run out.
            $user->forceFill(['banned_at' => null, 'banned_until' => null, 'ban_reason' => null])->saveQuietly();
        }

        if ($user?->isBanned()) {
            $until = $user->banned_until?->toIso8601String();
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('suspended')->with('ban', ['until' => $until]);
        }

        if (! $request->routeIs(self::ALWAYS_ALLOWED)) {
            $signals = array_intersect_key($this->guard->signals($request), array_flip(['ip', 'network', 'device', 'fingerprint']));
            $key = 'deepban:'.sha1(implode('|', $signals));
            $banned = Cache::remember($key, 300, fn () => (bool) $this->guard->match($signals, siteWide: true));
            if ($banned) {
                return Inertia::render('Auth/Suspended', ['ban' => ['deep' => true]])->toResponse($request)->setStatusCode(403);
            }
        }

        $seen = $user?->getAttributes()['last_seen_at'] ?? null;
        if ($user && (! $seen || $user->last_seen_at->lt(now()->subMinutes(5)))) {
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        return $next($request);
    }
}
