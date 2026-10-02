<?php

namespace App\Http\Controllers\Auth;

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
 * Second sign-in step for anyone with two-step sign-in turned on: customers who chose it and every
 * staff member (for staff it is mandatory, see StaffTwoFactorSetupController). The staff variant
 * lives under /admin and answers 404 unless a staff password was just entered on this browser.
 */
class TwoFactorChallengeController extends Controller
{
    public function __construct(private readonly PendingLogin $pending, private readonly TwoFactor $twoFactor) {}

    public function create(Request $request, bool $staff = false): Response|RedirectResponse
    {
        $pending = $this->pending->get($request);
        if (! $pending || $pending['staff'] !== $staff || ! $pending['user']->hasTwoFactor()) {
            abort_if($staff, 404);

            return to_route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'staff' => $staff,
            'action' => $staff ? route('admin.two-factor.verify') : route('two-factor.verify'),
            'cancel' => $staff ? route('admin.login') : route('login'),
        ]);
    }

    public function store(Request $request, bool $staff = false): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:20']]);
        $pending = $this->pending->get($request);
        if (! $pending || $pending['staff'] !== $staff) {
            abort_if($staff, 404);

            return to_route('login')->with('error', __('That sign-in took too long. Please enter your password again.'));
        }

        $user = $pending['user'];
        if (! $this->twoFactor->verify($user, (string) $request->input('code'))) {
            ActivityLog::record('auth.2fa.failed', 'Wrong two-step sign-in code', $user);
            if ($this->pending->failed($request)) {
                return redirect($staff ? route('admin.login') : route('login'))
                    ->with('error', __('Too many wrong codes. Please enter your password again.'));
            }

            throw ValidationException::withMessages(['code' => __('That code didn\'t work. Check the time on your phone and try the newest code.')]);
        }

        $this->pending->complete($request, $user, $pending['remember'], verifiedSecondStep: true);

        if ($staff) {
            $request->session()->put('admin_last_active', now()->timestamp);
            ActivityLog::record('admin.login', 'Signed in to the admin panel (two-step)');

            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->intended(route('account.dashboard'))->with('success', __('Welcome back.'));
    }
}
