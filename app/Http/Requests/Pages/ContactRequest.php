<?php

namespace App\Http\Requests\Pages;

use App\Rules\Recaptcha;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContactRequest extends FormRequest
{
    public const TOPICS = [
        'Order & delivery',
        'Prescription help',
        'Product question',
        'Returns & refunds',
        'Account & login',
        'Partnerships',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email:rfc', 'max:120'],
            'phone' => ['nullable', 'string', 'max:20'],
            'topic' => ['required', Rule::in(self::TOPICS)],
            'message' => ['required', 'string', 'min:20', 'max:2000'],
            // Honeypot: real users never see or fill this field.
            'website' => ['prohibited'],
            'recaptcha_token' => [Recaptcha::v3('contact')],
        ];
    }
}
