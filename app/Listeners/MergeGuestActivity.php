<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\Personalization\Interactions;
use App\Services\Personalization\Visitor;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;

/** Carries a guest's browsing history and personal offers into the account they sign in to. */
class MergeGuestActivity
{
    public function __construct(private readonly Interactions $interactions, private readonly Visitor $visitor) {}

    public function handle(Login|Registered $event): void
    {
        if ($event->user instanceof User) {
            $this->interactions->mergeGuestInto($event->user, $this->visitor->guestKey());
        }
    }
}
