<?php

namespace App\Services\Security;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * The gap between "password correct" and "signed in" while a second step is outstanding.
 *
 * Only the user id, the remember choice and whether it was the staff sign-in are kept in the
 * session, for five minutes. Nothing about the account is shown until the second step passes, and
 * after five wrong codes the password has to be entered again.
 */
class PendingLogin
{
    private const KEY = 'login.pending';

    public const TTL_SECONDS = 300;

    public const MAX_ATTEMPTS = 5;

    /** Session flag EnsureAdmin checks: this session passed two-factor for this user id. */
    public const VERIFIED = 'two_factor.verified';

    public function start(Request $request, User $user, bool $remember, bool $staff): void
    {
        $request->session()->regenerate();
        $request->session()->put(self::KEY, [
            'id' => $user->id,
            'remember' => $remember,
            'staff' => $staff,
            'expires' => now()->addSeconds(self::TTL_SECONDS)->timestamp,
            'attempts' => 0,
        ]);
    }

    /** @return array{user: User, remember: bool, staff: bool}|null */
    public function get(Request $request): ?array
    {
        $pending = $request->session()->get(self::KEY);
        if (! is_array($pending) || ($pending['expires'] ?? 0) < now()->timestamp) {
            $request->session()->forget(self::KEY);

            return null;
        }
        $user = User::find($pending['id']);
        if (! $user || $user->isBanned() || ($pending['staff'] && ! $user->isAdmin())) {
            $request->session()->forget(self::KEY);

            return null;
        }

        return ['user' => $user, 'remember' => (bool) $pending['remember'], 'staff' => (bool) $pending['staff']];
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

    /** Finishes the sign-in (fires the normal Login event: activity log, guest merges). */
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
