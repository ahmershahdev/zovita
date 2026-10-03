<?php

namespace App\Services\Security;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 30-second steps, 6 digits) for any
 * authenticator app, plus single-use recovery codes.
 *
 *  - A code is accepted for the current step and one step either side (clock drift), and the step
 *    it matched is stored, so the same code (or an older one) can never be used twice.
 *  - Recovery codes are stored hashed (encrypted at rest on top) and each works once.
 */
class TwoFactor
{
    public const DIGITS = 6;

    public const PERIOD = 30;

    public const WINDOW = 1;

    public const RECOVERY_CODES = 8;

    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    public function code(string $secret, ?int $step = null): string
    {
        $step ??= intdiv(now()->getTimestamp(), self::PERIOD);
        $hash = hash_hmac('sha1', pack('J', $step), $this->base32Decode($secret), true);
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24) | (ord($hash[$offset + 1]) << 16) | (ord($hash[$offset + 2]) << 8) | ord($hash[$offset + 3]);

        return str_pad((string) ($value % 10 ** self::DIGITS), self::DIGITS, '0', STR_PAD_LEFT);
    }

    /** The matching time-step, or null. Pass $after to refuse that step and anything older (replay). */
    public function matchStep(string $secret, string $code, ?int $after = null): ?int
    {
        $code = preg_replace('/\D/', '', $code);
        if (strlen($code) !== self::DIGITS) {
            return null;
        }
        $now = intdiv(now()->getTimestamp(), self::PERIOD);
        for ($step = $now - self::WINDOW; $step <= $now + self::WINDOW; $step++) {
            if (($after === null || $step > $after) && hash_equals($this->code($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /**
     * Checks a sign-in code for a user with two-factor turned on: an authenticator code (never
     * reused) or an unused recovery code (consumed). Runs under a row lock so two parallel requests
     * can't both spend the same code.
     */
    public function verify(User $user, string $input): bool
    {
        return DB::transaction(function () use ($user, $input) {
            $locked = User::whereKey($user->id)->lockForUpdate()->first();
            if (! $locked?->hasTwoFactor()) {
                return false;
            }

            if ($step = $this->matchStep($locked->two_factor_secret, $input, $locked->two_factor_last_step)) {
                $locked->forceFill(['two_factor_last_step' => $step])->save();

                return true;
            }

            $normalised = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $input));
            $codes = $locked->two_factor_recovery_codes ?? [];
            foreach ($codes as $i => $hash) {
                if (strlen($normalised) === 10 && hash_equals($hash, $this->hashRecovery($normalised))) {
                    unset($codes[$i]);
                    $locked->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();
                    ActivityLog::record('auth.2fa.recovery', 'Signed in with a recovery code ('.count($codes).' left)', $locked);

                    return true;
                }
            }

            return false;
        });
    }

    /** Turns two-factor on with a confirmed secret; returns the plain recovery codes (shown once). */
    public function enable(User $user, string $secret, int $step): array
    {
        [$plain, $hashed] = $this->makeRecoveryCodes();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => $hashed,
            'two_factor_confirmed_at' => now(),
            'two_factor_last_step' => $step,
        ])->save();
        ActivityLog::record('auth.2fa.enabled', 'Turned on two-step sign-in', $user);

        return $plain;
    }

    public function disable(User $user): void
    {
        $user->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null])->save();
        ActivityLog::record('auth.2fa.disabled', 'Turned off two-step sign-in', $user);
    }

    /** @return list<string> new plain codes; the old ones stop working */
    public function regenerateRecoveryCodes(User $user): array
    {
        [$plain, $hashed] = $this->makeRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => $hashed])->save();
        ActivityLog::record('auth.2fa.recovery_regenerated', 'Made new recovery codes', $user);

        return $plain;
    }

    public function otpauthUri(User $user, string $secret): string
    {
        $issuer = config('app.name', 'Zovita');

        return 'otpauth://totp/'.rawurlencode($issuer.':'.$user->email)
            .'?secret='.$secret.'&issuer='.rawurlencode($issuer).'&algorithm=SHA1&digits='.self::DIGITS.'&period='.self::PERIOD;
    }

    public function qrSvg(string $uri): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle(220, 1), new SvgImageBackEnd)))->writeString($uri);

        return trim(substr($svg, strpos($svg, "\n") + 1)); // drop the XML declaration
    }

    /** "ABCD EFGH …" for people who type the key in by hand. */
    public static function groupSecret(string $secret): string
    {
        return trim(chunk_split($secret, 4, ' '));
    }

    /** @return array{0: list<string>, 1: list<string>} */
    private function makeRecoveryCodes(): array
    {
        $plain = [];
        for ($i = 0; $i < self::RECOVERY_CODES; $i++) {
            $plain[] = Str::upper(Str::random(5).'-'.Str::random(5));
        }

        return [$plain, array_map(fn ($c) => $this->hashRecovery(str_replace('-', '', $c)), $plain)];
    }

    private function hashRecovery(string $code): string
    {
        return hash_hmac('sha256', strtoupper($code), (string) config('app.key'));
    }

    private function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::BASE32[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    private function base32Decode(string $secret): string
    {
        $bits = '';
        foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $secret))) as $char) {
            $bits .= str_pad(decbin(strpos(self::BASE32, $char)), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
