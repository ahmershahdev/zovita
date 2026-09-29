<?php

namespace App\Rules;

use App\Services\Security\RecaptchaService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Usage: 'recaptcha_token' => [Recaptcha::v3('login')]  or  [Recaptcha::v2()]
 */
class Recaptcha implements ValidationRule
{
    /**
     * Implicit: run even when the field is absent. Otherwise a bot could skip the
     * check simply by omitting `recaptcha_token` from the request.
     */
    public bool $implicit = true;

    public function __construct(private readonly string $version, private readonly ?string $action = null) {}

    public static function v3(string $action): self
    {
        return new self(RecaptchaService::V3, $action);
    }

    public static function v2(): self
    {
        return new self(RecaptchaService::V2);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $passes = app(RecaptchaService::class)->verify(
            is_string($value) ? $value : null,
            $this->version,
            $this->action,
            request()->ip(),
        );

        if (! $passes) {
            $fail($this->version === RecaptchaService::V2
                ? 'Please confirm you are not a robot.'
                : 'We could not verify this request. Please refresh the page and try again.');
        }
    }
}
