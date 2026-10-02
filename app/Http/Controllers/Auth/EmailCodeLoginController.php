<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\Recaptcha;
use App\Services\Security\LoginCodes;
use App\Services\Security\PendingLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Passwordless customer sign-in: "e-mail me a code". The answer is identical whether or not the
 * address has an account (no enumeration); staff must use the staff sign-in; accounts with an
 * authenticator app still need its code afterwards.
 */
class EmailCodeLoginController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/EmailCode');
    }

    public function store(Request $request, PendingLogin $pending, LoginCodes $codes): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:120'],
            'recaptcha_token' => [Recaptcha::v3('login')],
        ]);
        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();
        $eligible = $user && ! $user->isBanned() && ! ($user->getAttributes()['is_admin'] ?? false);

        $pending->start($request, $eligible ? $user : null, remember: true, staff: false, method: 'email', thenTotp: $eligible && $user->hasTwoFactor());
        $request->session()->put('login.ghost', $email);
        if ($eligible) {
            $codes->send($user);
        }

        return to_route('two-factor.challenge');
    }
}
