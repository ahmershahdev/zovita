<?php

namespace App\Http\Requests\Auth;

use App\Rules\Recaptcha;
use App\Services\Security\BanGuard;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['boolean'],
            'fp' => ['nullable', 'string', 'max:64'],
            'recaptcha_token' => [Recaptcha::v3('login')],
        ];
    }

    /**
     * Checks credentials first, and only then decides whether a session may start:
     *  - staff accounts can only sign in through the staff sign-in (and customers never through it);
     *    both cases get the same generic error, so the form never reveals which accounts are staff
     *  - banned accounts are refused with the date their ban ends (if it ends)
     *  - devices/networks under a ban can't sign in to any account
     *
     * @throws ValidationException
     */
    public function authenticate(bool $staff = false): void
    {
        $this->ensureIsNotRateLimited();
        $credentials = $this->only('email', 'password');
        $provider = Auth::guard('web')->getProvider();
        $user = $provider->retrieveByCredentials(['email' => strtolower(trim((string) $credentials['email']))]);

        $isStaff = (bool) ($user?->getAttributes()['is_admin'] ?? false);
        if (! $user || ! $provider->validateCredentials($user, $credentials) || $isStaff !== $staff) {
            RateLimiter::hit($this->throttleKey(), $staff ? 900 : 60);
            event(new Failed('web', $user, $credentials));

            throw ValidationException::withMessages(['email' => trans('auth.failed')]);
        }

        if ($user->isBanned()) {
            RateLimiter::hit($this->throttleKey());
            $until = $user->banned_until;

            throw ValidationException::withMessages(['email' => $until
                ? __('This account is suspended until :date.', ['date' => $until->timezone('Asia/Karachi')->format('j M Y, g:i A')])
                : __('This account has been closed. Contact support if you think this is a mistake.')]);
        }

        $guard = app(BanGuard::class);
        if ($guard->match(array_intersect_key($guard->signals($this), array_flip(['device', 'fingerprint', 'ip', 'network'])))) {
            throw ValidationException::withMessages(['email' => __('Sign-in is not available from this device.')]);
        }

        Auth::guard('web')->login($user, $this->boolean('remember'));
        RateLimiter::clear($this->throttleKey());
    }

    private function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));
        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]),
        ]);
    }

    private function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
