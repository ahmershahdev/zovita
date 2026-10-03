<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Security\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A staff member's own sign-in security. Until they set up an authenticator app here, their
 * password alone signs them in; after that every sign-in also needs the app's code (recovery codes
 * cover a lost phone). Turning the app off again needs a current app code.
 */
class SecurityController extends Controller
{
    private const SECRET = 'two_factor.staff_secret';

    public function show(Request $request, TwoFactor $twoFactor): Response
    {
        $user = $request->user();
        $secret = $user->hasTwoFactor() ? null : $request->session()->get(self::SECRET);

        return Inertia::render('Admin/Security', [
            'role' => ['label' => $user->staffRole()?->label(), 'description' => $user->staffRole()?->description(), 'permissions' => $user->staffRole()?->permissions() ?? []],
            'twoFactor' => [
                'enabled' => $user->hasTwoFactor(),
                'since' => $user->two_factor_confirmed_at?->toIso8601String(),
                'recovery_left' => count($user->two_factor_recovery_codes ?? []),
                'setup' => $secret ? [
                    'qr' => $twoFactor->qrSvg($twoFactor->otpauthUri($user, $secret)),
                    'secret' => TwoFactor::groupSecret($secret),
                ] : null,
            ],
            'email' => $user->email,
            'recoveryCodes' => $request->session()->get('recovery_codes'),
        ]);
    }

    public function start(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        if (! $request->user()->hasTwoFactor()) {
            $request->session()->put(self::SECRET, $twoFactor->generateSecret());
        }

        return back();
    }

    public function confirm(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:10']]);
        $secret = $request->session()->get(self::SECRET);
        if (! $secret || $request->user()->hasTwoFactor()) {
            return back();
        }
        $step = $twoFactor->matchStep($secret, (string) $request->input('code'));
        if (! $step) {
            throw ValidationException::withMessages(['code' => 'That code didn\'t match. Type the newest 6-digit code from the app.']);
        }
        $codes = $twoFactor->enable($request->user(), $secret, $step);
        $request->session()->forget(self::SECRET);

        return back()->with('recovery_codes', $codes)->with('success', 'Authenticator app is on. Save your recovery codes now.');
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->session()->forget(self::SECRET);

        return back();
    }

    /** Back to password-only sign-in (e.g. replacing a phone): needs a current authenticator code. */
    public function disable(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:20']]);
        if (! $twoFactor->verify($request->user(), (string) $request->input('code'))) {
            throw ValidationException::withMessages(['disable_code' => 'That code didn\'t work.']);
        }
        $twoFactor->disable($request->user());

        return back()->with('success', 'Authenticator app removed. Two-step sign-in is off until you set it up again.');
    }

    public function regenerate(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:20']]);
        if (! $twoFactor->verify($request->user(), (string) $request->input('code'))) {
            throw ValidationException::withMessages(['code' => 'That code didn\'t work.']);
        }

        return back()->with('recovery_codes', $twoFactor->regenerateRecoveryCodes($request->user()))
            ->with('success', 'New recovery codes made. The old ones no longer work.');
    }
}
