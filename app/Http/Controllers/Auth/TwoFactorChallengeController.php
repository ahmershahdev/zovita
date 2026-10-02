<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Security\ActivityLog;
use App\Services\Security\LoginCodes;
use App\Services\Security\PendingLogin;
use App\Services\Security\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Second sign-in step: a code from the authenticator app ("totp") or a one-time code e-mailed by
 * LoginCodes ("email"). Staff always get one of the two (e-mail until they set up an app from
 * their panel); customers get it when they turned on two-step sign-in or chose "e-mail me a code".
 * The staff variant lives under /admin and answers 404 unless a staff password was just entered.
 */
class TwoFactorChallengeController extends Controller
{
    public function __construct(
        private readonly PendingLogin $pending,
        private readonly TwoFactor $twoFactor,
        private readonly LoginCodes $codes,
    ) {}

    public function create(Request $request, bool $staff = false): Response|RedirectResponse
    {
        $pending = $this->pending->get($request);
        if (! $pending || $pending['staff'] !== $staff) {
            abort_if($staff, 404);

            return to_route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'staff' => $staff,
            'method' => $pending['method'],
            'email' => $pending['method'] === 'email' ? $this->mask($pending['user']?->email ?? (string) $request->session()->get('login.ghost')) : null,
            'action' => $staff ? route('admin.two-factor.verify') : route('two-factor.verify'),
            'resend' => $staff ? route('admin.two-factor.resend') : route('two-factor.resend'),
            'cancel' => $staff ? route('admin.login') : route('login'),
            'minutes' => LoginCodes::TTL_MINUTES,
        ]);
    }

    public function resend(Request $request, bool $staff = false): RedirectResponse
    {
        $pending = $this->pending->get($request);
        abort_unless($pending && $pending['staff'] === $staff && $pending['method'] === 'email', $staff ? 404 : 403);
        $sent = $pending['user'] ? $this->codes->send($pending['user']) : true;

        return back()->with($sent ? 'success' : 'error', $sent ? __('A new code is on its way.') : __('Please wait a minute before asking for another code.'));
    }

    public function store(Request $request, bool $staff = false): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:20']]);
        $pending = $this->pending->get($request);
        if (! $pending || $pending['staff'] !== $staff) {
            abort_if($staff, 404);

            return to_route('login')->with('error', __('That sign-in took too long. Please start again.'));
        }

        $user = $pending['user'];
        $input = (string) $request->input('code');
        $ok = $user && ($pending['method'] === 'email'
            ? $this->codes->verify($user, $input)
            : $this->twoFactor->verify($user, $input));

        if (! $ok) {
            if ($user) {
                ActivityLog::record('auth.2fa.failed', 'Wrong second-step sign-in code', $user);
            }
            if ($this->pending->failed($request)) {
                return redirect($staff ? route('admin.login') : route('login'))
                    ->with('error', __('Too many wrong codes. Please start again.'));
            }

            throw ValidationException::withMessages(['code' => $pending['method'] === 'email'
                ? __('That code didn\'t work. Check the newest e-mail from us, or ask for a new code.')
                : __('That code didn\'t work. Check the time on your phone and try the newest code.')]);
        }

        // Passwordless e-mail sign-in for an account that also has an authenticator: one more step.
        if ($pending['method'] === 'email' && $pending['then_totp']) {
            $this->pending->advanceToTotp($request);

            return redirect($staff ? route('admin.two-factor.challenge') : route('two-factor.challenge'));
        }

        $this->pending->complete($request, $user, $pending['remember'], verifiedSecondStep: true);

        if ($staff) {
            $request->session()->put('admin_last_active', now()->timestamp);
            ActivityLog::record('admin.login', 'Signed in to the admin panel ('.($pending['method'] === 'email' ? 'e-mail code' : 'authenticator app').')');

            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->intended(route('account.dashboard'))->with('success', __('Welcome back.'));
    }

    /** a****@example.com — enough to recognise, not enough to harvest. */
    private function mask(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($local, 0, 1).str_repeat('•', max(3, mb_strlen($local) - 1)).'@'.$domain;
    }
}
