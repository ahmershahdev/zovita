<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\Experiments\Experiments;
use App\Services\Personalization\Interactions;
use App\Services\Personalization\Visitor;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;

/** Carries a guest's browsing history, personal offers and A/B variants into the account they sign in to. */
class MergeGuestActivity
{
    public function __construct(private readonly Interactions $interactions, private readonly Visitor $visitor, private readonly Experiments $experiments) {}

    public function handle(Login|Registered $event): void
    {
        if ($event->user instanceof User) {
            $this->interactions->mergeGuestInto($event->user, $this->visitor->guestKey());
            // Keep the A/B variant the shopper already saw as a guest.
            $this->experiments->mergeGuestInto($this->visitor->guestKey(), 'u:'.$event->user->id);
        }
    }
}
