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
 * (5 tries, then a 15-minute lock per email + IP), and it only accepts staff accounts.
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
     * Password first, then the mandatory second step: staff who have two-step sign-in get the
     * code prompt, staff who don't yet must set it up before any session starts. "Remember me"
     * is never offered for staff.
     */
    public function store(LoginRequest $request, PendingLogin $pending): RedirectResponse
    {
        // A customer session on this browser is replaced by the staff session.
        if (Auth::check()) {
            Auth::guard('web')->logout();
        }
        $user = $request->validateUser(staff: true);
        $pending->start($request, $user, remember: false, staff: true);
        ActivityLog::record('admin.password_ok', 'Entered the correct staff password (second step pending)', $user);

        return $user->hasTwoFactor()
            ? to_route('admin.two-factor.challenge')
            : to_route('admin.two-factor.setup');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login')->with('success', 'Signed out of the admin panel.');
    }
}
