<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class NewsletterWelcomeMail extends Mailable
{
    use Queueable;

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'You are on the Zovita wellness list', tags: ['newsletter']);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.newsletter');
    }
}
