<?php

namespace App\Services\Mail;

use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends transactional mail (via Resend when MAIL_MAILER=resend) without letting a mail
 * provider outage break the customer's request. Failures are reported, not thrown.
 */
class TransactionalMailer
{
    public function send(string|array $to, Mailable $mailable): bool
    {
        try {
            Mail::to($to)->send($mailable);

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
