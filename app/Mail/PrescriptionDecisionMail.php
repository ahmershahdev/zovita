<?php

namespace App\Mail;

use App\Enums\PrescriptionStatus;
use App\Models\Prescription;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Tells the customer whether their prescription was approved or rejected (and why). */
class PrescriptionDecisionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Prescription $prescription) {}

    public function envelope(): Envelope
    {
        $approved = $this->prescription->status === PrescriptionStatus::Approved;

        return new Envelope(
            subject: "Prescription {$this->prescription->reference} ".($approved ? 'approved' : 'needs attention'),
            tags: ['prescription'],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.prescription-decision', with: [
            'approved' => $this->prescription->status === PrescriptionStatus::Approved,
        ]);
    }
}
