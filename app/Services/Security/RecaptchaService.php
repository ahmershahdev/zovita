<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Verifies Google reCAPTCHA tokens.
 *  - v3: invisible, returns a 0.0–1.0 score; we also check the expected action.
 *  - v2: "I'm not a robot" checkbox, pass/fail.
 */
class RecaptchaService
{
    public const V2 = 'v2';

    public const V3 = 'v3';

    /** A version is enforced only when switched on and a secret key is configured. */
    public function enabled(string $version): bool
    {
        return (bool) config('services.recaptcha.enabled')
            && filled(config("services.recaptcha.{$version}.secret_key"))
            && filled(config("services.recaptcha.{$version}.site_key"));
    }

    public function verify(?string $token, string $version, ?string $action = null, ?string $ip = null): bool
    {
        if (! $this->enabled($version)) {
            return true;
        }

        if (blank($token)) {
            return false;
        }

        try {
            $result = Http::asForm()
                ->timeout(8)
                ->post(config('services.recaptcha.verify_url'), array_filter([
                    'secret' => config("services.recaptcha.{$version}.secret_key"),
                    'response' => $token,
                    'remoteip' => $ip,
                ]))
                ->json();
        } catch (Throwable $e) {
            // Fail closed: if Google cannot be reached we do not accept unverified submissions.
            Log::warning('reCAPTCHA verification request failed', ['error' => $e->getMessage()]);

            return false;
        }

        if (! ($result['success'] ?? false)) {
            return false;
        }

        if ($version === self::V3) {
            $scoreOk = ($result['score'] ?? 0) >= (float) config('services.recaptcha.v3.min_score', 0.5);
            $actionOk = $action === null || ($result['action'] ?? null) === $action;

            return $scoreOk && $actionOk;
        }

        return true;
    }

    /** Public config handed to the frontend. Site keys are public by design. */
    public function clientConfig(): array
    {
        return [
            'v3' => $this->enabled(self::V3) ? config('services.recaptcha.v3.site_key') : null,
            'v2' => $this->enabled(self::V2) ? config('services.recaptcha.v2.site_key') : null,
        ];
    }
}
