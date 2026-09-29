<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Sent twice: to the support team (reply-to customer) and as an acknowledgement to the customer. */
class ContactMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactMessage $contact, public bool $forTeam = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: $this->forTeam ? [new Address($this->contact->email, $this->contact->name)] : [],
            subject: $this->forTeam
                ? "[Contact] {$this->contact->topic} — {$this->contact->name}"
                : 'We received your message — Zovita Care',
            tags: ['contact'],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact');
    }
}
