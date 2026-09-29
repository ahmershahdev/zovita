<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Checkout\PlaceOrderRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => $this->filled('phone') ? preg_replace('/[^\d+]/', '', (string) $this->input('phone')) : null,
            'email' => strtolower(trim((string) $this->input('email'))),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:120', Rule::unique('users', 'email')->ignore($this->user()->id)],
            'phone' => ['nullable', 'regex:'.PlaceOrderRequest::PHONE_REGEX],
            'city' => ['nullable', Rule::in(config('zovita.cities'))],
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }
}
