<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Security\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** A staff member's own two-step sign-in: status, and new recovery codes (shown once). */
class SecurityController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Admin/Security', [
            'role' => ['label' => $user->staffRole()?->label(), 'description' => $user->staffRole()?->description(), 'permissions' => $user->staffRole()?->permissions() ?? []],
            'twoFactor' => [
                'since' => $user->two_factor_confirmed_at?->toIso8601String(),
                'recovery_left' => count($user->two_factor_recovery_codes ?? []),
            ],
            'recoveryCodes' => $request->session()->get('recovery_codes'),
        ]);
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
