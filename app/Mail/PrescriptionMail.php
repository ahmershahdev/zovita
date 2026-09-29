<?php

namespace App\Mail;

use App\Models\Prescription;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Customer receipt, or (forTeam) the pharmacist copy with the prescription attached. */
class PrescriptionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Prescription $prescription, public bool $forTeam = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->forTeam
                ? "Prescription {$this->prescription->reference} needs review"
                : "Prescription {$this->prescription->reference} received",
            tags: ['prescription'],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.prescription');
    }

    public function attachments(): array
    {
        if (! $this->forTeam) {
            return [];
        }

        return [
            Attachment::fromStorageDisk(config('zovita.prescriptions.disk'), $this->prescription->file_path)
                ->as($this->prescription->original_name),
        ];
    }
}
