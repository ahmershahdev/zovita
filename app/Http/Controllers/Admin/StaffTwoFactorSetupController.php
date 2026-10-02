<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Security\ActivityLog;
use App\Services\Security\PendingLogin;
use App\Services\Security\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Two-step sign-in is mandatory for staff. A staff member without it who enters the right
 * password lands here (still signed out), scans the QR code, and is only signed in once their
 * authenticator app produces a valid code. The secret lives in the session until then.
 */
class StaffTwoFactorSetupController extends Controller
{
    private const SECRET = 'two_factor.setup_secret';

    public function __construct(private readonly PendingLogin $pending, private readonly TwoFactor $twoFactor) {}

    public function create(Request $request): Response
    {
        $pending = $this->pending->get($request);
        abort_unless($pending && $pending['staff'] && ! $pending['user']->hasTwoFactor(), 404);

        $secret = $request->session()->get(self::SECRET) ?: $this->twoFactor->generateSecret();
        $request->session()->put(self::SECRET, $secret);

        return Inertia::render('Admin/TwoFactorSetup', [
            'name' => $pending['user']->name,
            'qr' => $this->twoFactor->qrSvg($this->twoFactor->otpauthUri($pending['user'], $secret)),
            'secret' => TwoFactor::groupSecret($secret),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:10']]);
        $pending = $this->pending->get($request);
        $secret = $request->session()->get(self::SECRET);
        abort_unless($pending && $pending['staff'] && $secret && ! $pending['user']->hasTwoFactor(), 404);

        $step = $this->twoFactor->matchStep($secret, (string) $request->input('code'));
        if (! $step) {
            if ($this->pending->failed($request)) {
                return to_route('admin.login')->with('error', 'Too many wrong codes. Please sign in again.');
            }

            throw ValidationException::withMessages(['code' => 'That code didn\'t match. Make sure you scanned this QR code, then type the newest 6-digit code.']);
        }

        $user = $pending['user'];
        $codes = $this->twoFactor->enable($user, $secret, $step);
        $request->session()->forget(self::SECRET);
        $this->pending->complete($request, $user, false, verifiedSecondStep: true);
        $request->session()->put('admin_last_active', now()->timestamp);
        ActivityLog::record('admin.login', 'Set up two-step sign-in and signed in to the admin panel');

        return to_route('admin.security')
            ->with('recovery_codes', $codes)
            ->with('success', 'Two-step sign-in is on. Save your recovery codes now.');
    }
}
