<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\Security\PendingLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', ['status' => session('status')]);
    }

    public function store(LoginRequest $request, PendingLogin $pending): RedirectResponse
    {
        $user = $request->validateUser();
        if ($user->hasTwoFactor()) {
            $pending->start($request, $user, $request->boolean('remember'), staff: false);

            return to_route('two-factor.challenge');
        }

        $pending->complete($request, $user, $request->boolean('remember'), verifiedSecondStep: false);

        return redirect()->intended(route('account.dashboard'))->with('success', __('Welcome back.'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('home');
    }
}
