<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Security\PendingLogin;
use App\Services\Security\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Optional two-step sign-in for customers (Account → Security). Turning it on is two steps: start
 * (a secret is kept in the session and shown as a QR code) and confirm with a code from the app.
 * Turning it off or making new recovery codes needs the account password.
 */
class TwoFactorController extends Controller
{
    public const SECRET = 'two_factor.account_secret';

    public function __construct(private readonly TwoFactor $twoFactor) {}

    public function start(Request $request): RedirectResponse
    {
        if ($request->user()->hasTwoFactor()) {
            return back();
        }
        $request->session()->put(self::SECRET, $this->twoFactor->generateSecret());

        return back()->with('tab', 'security');
    }

    public function confirm(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:10']]);
        $user = $request->user();
        $secret = $request->session()->get(self::SECRET);
        if (! $secret || $user->hasTwoFactor()) {
            return back();
        }
        $step = $this->twoFactor->matchStep($secret, (string) $request->input('code'));
        if (! $step) {
            throw ValidationException::withMessages(['code' => __('That code didn\'t match. Type the newest 6-digit code from your app.')]);
        }

        $codes = $this->twoFactor->enable($user, $secret, $step);
        $request->session()->forget(self::SECRET);
        $request->session()->put(PendingLogin::VERIFIED, $user->id);

        return back()->with('recovery_codes', $codes)->with('tab', 'security')
            ->with('success', __('Two-step sign-in is on. Save your recovery codes somewhere safe.'));
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->session()->forget(self::SECRET);

        return back()->with('tab', 'security');
    }

    public function recoveryCodes(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        abort_unless($request->user()->hasTwoFactor(), 404);

        return back()->with('recovery_codes', $this->twoFactor->regenerateRecoveryCodes($request->user()))->with('tab', 'security')
            ->with('success', __('New recovery codes made. The old ones no longer work.'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);
        // Staff manage theirs from the admin panel (My security), which asks for a current app code.
        abort_if($request->user()->staffRole() !== null, 403);
        $this->twoFactor->disable($request->user());

        return back()->with('tab', 'security')->with('success', __('Two-step sign-in is off.'));
    }

    /** Props for the account page's security tab. */
    public static function props(Request $request, TwoFactor $twoFactor): array
    {
        $user = $request->user();
        $secret = $user->hasTwoFactor() ? null : $request->session()->get(self::SECRET);

        return [
            'enabled' => $user->hasTwoFactor(),
            'recovery_left' => count($user->two_factor_recovery_codes ?? []),
            'setup' => $secret ? [
                'qr' => $twoFactor->qrSvg($twoFactor->otpauthUri($user, $secret)),
                'secret' => TwoFactor::groupSecret($secret),
            ] : null,
            'recovery_codes' => $request->session()->get('recovery_codes'),
        ];
    }
}
