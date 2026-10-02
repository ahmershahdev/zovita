<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Security\ActivityLog;
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

    public function store(LoginRequest $request): RedirectResponse
    {
        // A customer session on this browser is replaced by the staff session.
        if (Auth::check()) {
            Auth::guard('web')->logout();
        }
        $request->authenticate(staff: true);
        $request->session()->regenerate();
        $request->session()->put('admin_last_active', now()->timestamp);
        ActivityLog::record('admin.login', 'Signed in to the admin panel');

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
