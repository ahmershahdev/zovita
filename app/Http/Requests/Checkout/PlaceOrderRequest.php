<?php

namespace App\Http\Requests\Checkout;

use App\Rules\Recaptcha;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        return ['phone.regex' => 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.'];
    }
}
