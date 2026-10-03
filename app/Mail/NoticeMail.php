<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * One branded template for short account and order e-mails: sign-in codes, e-mail confirmation,
 * new sign-in alerts, order status updates and refunds. Optional big code and optional button.
 */
class NoticeMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param  list<string>  $lines */
    public function __construct(
        public string $title,
        public string $eyebrow,
        public string $heading,
        public array $lines,
        public ?string $code = null,
        public ?string $buttonUrl = null,
        public ?string $buttonLabel = null,
        public array $labels = ['account'],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->title, tags: $this->labels);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.notice', with: [
            'eyebrow' => $this->eyebrow,
            'heading' => $this->heading,
            'lines' => $this->lines,
            'code' => $this->code,
            'buttonUrl' => $this->buttonUrl,
            'buttonLabel' => $this->buttonLabel,
        ]);
    }
}
