<?php

namespace App\Services\Mail;

use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends transactional mail (via Resend when MAIL_MAILER=resend) without letting a mail
 * provider outage break the customer's request. Failures are reported, not thrown.
 *
 * With a real queue (QUEUE_CONNECTION=redis|database) mail is queued, so checkout and sign-up
 * never wait on the mail provider — essential under load. `sync` sends inline (local dev).
 */
class TransactionalMailer
{
    public function send(string|array $to, Mailable $mailable): bool
    {
        try {
            config('queue.default') === 'sync'
                ? Mail::to($to)->send($mailable)
                : Mail::to($to)->queue($mailable->onQueue('mail'));

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }

    public function toTeam(Mailable $mailable): bool
    {
        return $this->send((string) config('zovita.admin_email'), $mailable);
    }
}
