<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\Wishlist\WishlistService;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Registered;

/** Keeps items a guest saved before signing in or signing up. */
class MergeGuestWishlist
{
    public function __construct(private readonly WishlistService $wishlist) {}

    public function handle(Login|Registered $event): void
    {
        if ($event->user instanceof User) {
            $this->wishlist->mergeGuestInto($event->user);
        }
    }
}
