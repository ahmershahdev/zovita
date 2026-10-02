<?php

namespace App\Http\Requests\Auth;

use App\Rules\Recaptcha;
use App\Services\Security\ActivityLog;
use App\Services\Security\BanGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:80'],
            'email' => ['required', 'string', 'email:rfc', 'max:120', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'terms' => ['accepted'],
            'fp' => ['nullable', 'string', 'max:64'],
            'recaptcha_token' => [Recaptcha::v2()],
        ];
    }

    public function messages(): array
    {
        return ['terms.accepted' => 'Please accept the terms to create an account.'];
    }

    /** Identities under an active ban (email and its aliases, phone, device, fingerprint, network) can't get through. */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $guard = app(BanGuard::class);
            if ($guard->match($guard->signals($this, $this->input('email'), null))) {
                ActivityLog::record('ban.blocked', 'Blocked sign-up from banned details', meta: ['email' => $this->input('email')]);
                $validator->errors()->add('email', __('We can\'t accept this request with these details. Please contact support.'));
            }
        }];
    }
}
