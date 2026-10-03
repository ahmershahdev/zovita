<?php

namespace App\Http\Requests\Storefront;

use App\Http\Requests\Checkout\PlaceOrderRequest;
use App\Rules\CleanFile;
use App\Rules\Recaptcha;
use Illuminate\Foundation\Http\FormRequest;

class PrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => preg_replace('/[^\d+]/', '', (string) $this->input('phone'))]);
    }

    public function rules(): array
    {
        $rx = config('zovita.prescriptions');

        return [
            'name' => ['required', 'string', 'min:3', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:120'],
            'phone' => ['required', 'regex:'.PlaceOrderRequest::PHONE_REGEX],
            'notes' => ['nullable', 'string', 'max:1000'],
            'file' => ['required', 'file', 'max:'.$rx['max_kb'], 'mimes:'.implode(',', $rx['mimes']), new CleanFile],
            'consent' => ['accepted'],
            'recaptcha_token' => [Recaptcha::v2()],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid mobile number, e.g. 0300 1234567.',
            'file.mimes' => 'Upload a JPG, PNG, WEBP or PDF file.',
            'consent.accepted' => 'Please confirm the prescription is valid and issued to you.',
        ];
    }
}
