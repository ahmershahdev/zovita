<?php

namespace App\Services\Security;

use App\Mail\NoticeMail;
use App\Models\User;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Support\Facades\DB;

/**
 * One-time 6-digit codes sent by e-mail: the second sign-in step for staff who haven't set up an
 * authenticator app yet, and passwordless "e-mail me a code" sign-in for customers.
 *
 *  - Codes come from random_int (a CSPRNG) and are stored only as an HMAC under the app key, with a
 *    unique index, so two live codes can never collide and a database leak reveals none.
 *  - Each lives 10 minutes, works once, and dies after 5 wrong tries.
 *  - Sending a new code cancels the previous one, and sending is throttled to one per minute.
 */
class LoginCodes
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function __construct(private readonly TransactionalMailer $mailer) {}

    /** Creates and e-mails a code; returns false if one was sent less than a minute ago. */
    public function send(User $user, string $purpose = 'login'): bool
    {
        $recent = DB::table('login_codes')->where('user_id', $user->id)->where('purpose', $purpose)
            ->whereNull('used_at')->where('created_at', '>', now()->subMinute())->exists();
        if ($recent) {
            return false;
        }

        DB::table('login_codes')->where('user_id', $user->id)->where('purpose', $purpose)->whereNull('used_at')->delete();
        do {
            $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
            $hash = $this->hash($user, $code);
        } while (DB::table('login_codes')->where('code_hash', $hash)->exists());

        DB::table('login_codes')->insert([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'code_hash' => $hash,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->mailer->send($user->email, new NoticeMail(
            title: "{$code} is your Zovita sign-in code",
            eyebrow: 'Sign-in code',
            heading: 'Your sign-in code',
            lines: [
                'Hi '.strtok($user->name, ' ').', use this code to finish signing in to Zovita'.($user->isAdmin() ? ' (admin panel)' : '').'.',
                'It works once and expires in '.self::TTL_MINUTES.' minutes. If you didn’t try to sign in, ignore this e-mail and consider changing your password.',
            ],
            code: $code,
            labels: ['security'],
        ));
        ActivityLog::record('auth.code.sent', 'E-mailed a one-time sign-in code', $user);

        return true;
    }

    /** Checks a code under a row lock; it is consumed on success and burned after 5 wrong tries. */
    public function verify(User $user, string $input, string $purpose = 'login'): bool
    {
        $code = preg_replace('/\D/', '', $input);

        return DB::transaction(function () use ($user, $code, $purpose) {
            $row = DB::table('login_codes')->where('user_id', $user->id)->where('purpose', $purpose)
                ->whereNull('used_at')->where('expires_at', '>', now())->latest('id')->lockForUpdate()->first();
            if (! $row) {
                return false;
            }
            if (strlen($code) === 6 && hash_equals($row->code_hash, $this->hash($user, $code))) {
                DB::table('login_codes')->where('id', $row->id)->update(['used_at' => now(), 'updated_at' => now()]);

                return true;
            }
            $attempts = $row->attempts + 1;
            DB::table('login_codes')->where('id', $row->id)->update($attempts >= self::MAX_ATTEMPTS
                ? ['attempts' => $attempts, 'used_at' => now(), 'updated_at' => now()]
                : ['attempts' => $attempts, 'updated_at' => now()]);

            return false;
        });
    }

    private function hash(User $user, string $code): string
    {
        return hash_hmac('sha256', $user->id.'|'.$code, (string) config('app.key'));
    }
}
