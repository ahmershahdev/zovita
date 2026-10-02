<?php

namespace App\Services\Wishlist;

use App\Models\Product;
use App\Models\User;
use Illuminate\Contracts\Auth\Factory as Auth;
use Illuminate\Contracts\Session\Session;

/**
 * Guests keep a wishlist in the session; signed-in customers keep it in the database.
 * The session list is merged into the account on login (see MergeGuestWishlist listener).
 */
class WishlistService
{
    private const KEY = 'wishlist.ids';

    public function __construct(private readonly Session $session, private readonly Auth $auth) {}

    /** @return list<int> */
    public function ids(): array
    {
        $user = $this->user();
        if ($user) {
            return $user->wishlist()->pluck('products.id')->map(fn ($id) => (int) $id)->all();
        }

        return array_values(array_unique(array_map('intval', (array) $this->session->get(self::KEY, []))));
    }

    /** Toggles a product and returns whether it is now saved. */
    public function toggle(Product $product): bool
    {
        $user = $this->user();
        if ($user) {
            $changes = $user->wishlist()->toggle($product->id);

            return $changes['attached'] !== [];
        }

        $ids = $this->ids();
        $saved = ! in_array($product->id, $ids, true);
        $ids = $saved ? [...$ids, $product->id] : array_values(array_diff($ids, [$product->id]));
        $this->session->put(self::KEY, $ids);

        return $saved;
    }

    public function add(Product $product): void
    {
        if (! in_array($product->id, $this->ids(), true)) {
            $this->toggle($product);
        }
    }

    public function remove(Product $product): void
    {
        if (in_array($product->id, $this->ids(), true)) {
            $this->toggle($product);
        }
    }

    public function mergeGuestInto(User $user): void
    {
        $guestIds = array_map('intval', (array) $this->session->pull(self::KEY, []));
        if ($guestIds !== []) {
            $existing = Product::whereIn('id', $guestIds)->pluck('id')->all();
            $user->wishlist()->syncWithoutDetaching($existing);
        }
    }

    private function user(): ?User
    {
        $user = $this->auth->guard()->user();

        return $user instanceof User ? $user : null;
    }
}
