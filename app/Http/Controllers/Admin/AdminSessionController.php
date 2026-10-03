<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Security\ActivityLog;
use App\Services\Security\PendingLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff sign-in. Not linked from anywhere in the store, never indexed, strictly rate-limited
 * (5 tries, then a 15-minute lock per email + IP), and it only accepts staff accounts. An
 * authenticator code is asked for once the staff member has turned one on from My security.
 */
class AdminSessionController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('Admin/Login');
    }

    /**
     * Password first. A staff member who turned on an authenticator app (My security) is then
     * asked for its code; until they do, the correct password signs them straight in so a fresh
     * account can get into the panel and set the app up. "Remember me" is never offered for staff.
     */
    public function store(LoginRequest $request, PendingLogin $pending): RedirectResponse
    {
        // A customer session on this browser is replaced by the staff session.
        if (Auth::check()) {
            Auth::guard('web')->logout();
        }
        $user = $request->validateUser(staff: true);

        if ($user->hasTwoFactor()) {
            $pending->start($request, $user, remember: false, staff: true, method: 'totp');
            ActivityLog::record('admin.password_ok', 'Entered the correct staff password (authenticator code pending)', $user);

            return to_route('admin.two-factor.challenge');
        }

        // No second factor set up: the password check is the whole sign-in (EnsureAdmin accepts it).
        $pending->complete($request, $user, remember: false, verifiedSecondStep: true);
        $request->session()->put('admin_last_active', now()->timestamp);
        ActivityLog::record('admin.login', 'Signed in to the admin panel (password only, no authenticator app yet)');

        return redirect()->intended(route('admin.dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login')->with('success', 'Signed out of the admin panel.');
    }
}
