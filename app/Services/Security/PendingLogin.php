<?php

namespace App\Services\Security;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * The gap between "first factor passed" and "signed in" while a second step is outstanding.
 *
 * Only the user id, the remember choice, whether it was the staff sign-in and which second step
 * is due ("totp" = authenticator app, "email" = 6-digit code e-mailed by LoginCodes) are kept in
 * the session, for ten minutes. After five wrong codes the sign-in starts over.
 *
 * A "ghost" pending sign-in (an e-mail-code request for an address with no account) behaves the
 * same on screen but can never succeed, so the form never reveals which e-mails have accounts.
 */
class PendingLogin
{
    private const KEY = 'login.pending';

    public const TTL_SECONDS = 600;

    public const MAX_ATTEMPTS = 5;

    /** Session flag EnsureAdmin checks: this session passed the second step for this user id. */
    public const VERIFIED = 'two_factor.verified';

    public function start(Request $request, ?User $user, bool $remember, bool $staff, string $method = 'totp', bool $thenTotp = false): void
    {
        $request->session()->regenerate();
        $request->session()->put(self::KEY, [
            'id' => $user?->id,
            'remember' => $remember,
            'staff' => $staff,
            'method' => $method,
            'then_totp' => $thenTotp,
            'expires' => now()->addSeconds(self::TTL_SECONDS)->timestamp,
            'attempts' => 0,
        ]);
    }

    /** @return array{user: ?User, remember: bool, staff: bool, method: string, then_totp: bool, ghost: bool}|null */
    public function get(Request $request): ?array
    {
        $pending = $request->session()->get(self::KEY);
        if (! is_array($pending) || ($pending['expires'] ?? 0) < now()->timestamp) {
            $request->session()->forget(self::KEY);

            return null;
        }
        $user = $pending['id'] ? User::find($pending['id']) : null;
        if ($pending['id'] && (! $user || $user->isBanned() || ($pending['staff'] && ! $user->isAdmin()))) {
            $request->session()->forget(self::KEY);

            return null;
        }

        return [
            'user' => $user,
            'remember' => (bool) $pending['remember'],
            'staff' => (bool) $pending['staff'],
            'method' => $pending['method'] ?? 'totp',
            'then_totp' => (bool) ($pending['then_totp'] ?? false),
            'ghost' => $user === null,
        ];
    }

    /** E-mail code accepted but the account also has an authenticator: ask for that next. */
    public function advanceToTotp(Request $request): void
    {
        $pending = $request->session()->get(self::KEY);
        $pending['method'] = 'totp';
        $pending['then_totp'] = false;
        $pending['attempts'] = 0;
        $request->session()->put(self::KEY, $pending);
    }

    /** Counts a wrong code; true when the pending sign-in has been thrown away. */
    public function failed(Request $request): bool
    {
        $pending = $request->session()->get(self::KEY);
        $pending['attempts'] = ($pending['attempts'] ?? 0) + 1;
        if ($pending['attempts'] >= self::MAX_ATTEMPTS) {
            $request->session()->forget(self::KEY);

            return true;
        }
        $request->session()->put(self::KEY, $pending);

        return false;
    }

    /** Finishes the sign-in (fires the normal Login event: activity log, guest merges, alerts). */
    public function complete(Request $request, User $user, bool $remember, bool $verifiedSecondStep): void
    {
        $request->session()->forget(self::KEY);
        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();
        if ($verifiedSecondStep) {
            $request->session()->put(self::VERIFIED, $user->id);
        }
    }
}
