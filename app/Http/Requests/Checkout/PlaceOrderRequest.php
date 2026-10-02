<?php

namespace App\Http\Requests\Checkout;

use App\Rules\Recaptcha;
use App\Services\Security\ActivityLog;
use App\Services\Security\BanGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PlaceOrderRequest extends FormRequest
{
    public const PHONE_REGEX = '/^(\+92|0092|0)?3\d{2}[\s-]?\d{7}$/';

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => preg_replace('/[^\d+]/', '', (string) $this->input('phone')),
            'email' => strtolower(trim((string) $this->input('email'))),
        ]);
    }

    public function rules(): array
    {
        $rx = config('zovita.prescriptions');

        return [
            'name' => ['required', 'string', 'min:3', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:120'],
            'phone' => ['required', 'regex:'.self::PHONE_REGEX],
            'address' => ['required', 'string', 'min:10', 'max:255'],
            'city' => ['required', Rule::in(config('zovita.cities'))],
            'postal_code' => ['nullable', 'digits_between:4,6'],
            'notes' => ['nullable', 'string', 'max:500'],
            'prescription' => ['nullable', 'file', 'max:'.$rx['max_kb'], 'mimes:'.implode(',', $rx['mimes'])],
            'recaptcha_token' => [Recaptcha::v3('checkout')],
            'checkout_token' => ['nullable', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Enter a valid mobile number, e.g. 0300 1234567.'];
    }

    /** Identities under an active ban (email and its aliases, phone, device, fingerprint, network) can't get through. */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $guard = app(BanGuard::class);
            if ($guard->match($guard->signals($this, $this->input('email'), $this->input('phone')))) {
                ActivityLog::record('ban.blocked', 'Blocked checkout from banned details', meta: ['email' => $this->input('email')]);
                $validator->errors()->add('email', __('We can\'t accept this request with these details. Please contact support.'));
            }
        }];
    }
}
