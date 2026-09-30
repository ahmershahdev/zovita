<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        // The email is not put in the link: it would end up in browser history and server logs.
        $url = route('password.reset', ['token' => $this->token]);
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Reset your Zovita password')
            ->view('emails.password-reset', ['url' => $url, 'minutes' => $minutes, 'name' => $notifiable->name]);
    }
}
