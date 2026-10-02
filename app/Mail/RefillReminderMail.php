<?php

namespace App\Mail;

use App\Models\RefillReminder;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\URL;

class RefillReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param  Collection<int, RefillReminder>  $reminders */
    public function __construct(public User $user, public Collection $reminders) {}

    public function envelope(): Envelope
    {
        $first = $this->reminders->first()?->product?->name;
        $more = $this->reminders->count() - 1;

        return new Envelope(
            subject: 'Time to refill '.($first ?? 'your regulars').($more > 0 ? " and {$more} more" : ''),
            tags: ['refill'],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.refill', with: [
            'user' => $this->user,
            'items' => $this->reminders->map(fn (RefillReminder $r) => [
                'name' => $r->product->name,
                'image' => $r->product->image,
                'due' => $r->due_at,
                'interval' => $r->interval_days,
                // One tap puts it back in the bag; signed so it can't be forged or altered.
                'url' => URL::temporarySignedRoute('refills.reorder', now()->addDays(14), ['reminder' => $r->id]),
            ]),
            'settingsUrl' => route('account.dashboard').'#refills',
        ]);
    }
}
