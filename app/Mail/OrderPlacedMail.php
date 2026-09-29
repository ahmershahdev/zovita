<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderPlacedMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param bool $forTeam internal copy for the pharmacy team */
    public function __construct(public Order $order, public bool $forTeam = false) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->forTeam
                ? "New order {$this->order->number} — PKR ".number_format($this->order->total)
                : "Your Zovita order {$this->order->number} is confirmed",
            tags: ['order'],
            metadata: ['order_number' => $this->order->number],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.orders.placed', with: [
            'order' => $this->order->loadMissing('items'),
            'forTeam' => $this->forTeam,
        ]);
    }
}
