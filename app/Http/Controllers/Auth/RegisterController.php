<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\WelcomeMail;
use App\Models\User;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisterController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    public function store(RegisterRequest $request, TransactionalMailer $mailer): RedirectResponse
    {
        try {
            $user = User::create($request->safe()->only(['name', 'email', 'password']));
        } catch (UniqueConstraintViolationException) {
            // Two sign-ups with the same email raced past the unique validation rule.
            throw ValidationException::withMessages(['email' => 'An account with this email already exists.']);
        }

        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();

        $mailer->send($user->email, new WelcomeMail($user));

        return to_route('account.dashboard')->with('success', 'Your account is ready. Welcome to Zovita.');
    }
}
