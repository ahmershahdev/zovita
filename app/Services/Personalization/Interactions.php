<?php

namespace App\Services\Personalization;

use App\Models\Offer;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Records the behaviour personalisation learns from: product views and time on page, bag adds
 * and purchases. Writes are tiny (one row per visitor × product) and never block the request
 * flow — a failure here must never break browsing or checkout.
 */
class Interactions
{
    /** Longest dwell we count from one page view (guards against tabs left open for hours). */
    public const MAX_DWELL = 600;

    public function __construct(private readonly Visitor $visitor) {}

    public function view(Product $product): void
    {
        $this->bump($product->id, ['views' => 1]);
    }

    public function dwell(int $productId, int $seconds): void
    {
        $seconds = max(0, min(self::MAX_DWELL, $seconds));
        if ($seconds > 0) {
            $this->bump($productId, ['dwell_seconds' => $seconds], touch: false);
        }
    }

    public function cartAdd(Product $product): void
    {
        $this->bump($product->id, ['cart_adds' => 1]);
    }

    /** @param array<int, int> $quantities product id => quantity */
    public function purchased(array $quantities, ?string $visitor = null, ?int $userId = null): void
    {
        foreach ($quantities as $productId => $quantity) {
            $this->bump((int) $productId, ['purchases' => 1], visitor: $visitor, userId: $userId, purchased: true);
        }
    }

    /** On sign-in: fold the guest's history (and live offers) into the account. */
    public function mergeGuestInto(User $user, ?string $guestKey): void
    {
        if (! $guestKey) {
            return;
        }
        $userKey = 'u:'.$user->id;

        DB::transaction(function () use ($guestKey, $userKey, $user) {
            foreach (ProductInteraction::where('visitor', $guestKey)->lockForUpdate()->get() as $row) {
                $existing = ProductInteraction::where('visitor', $userKey)->where('product_id', $row->product_id)->lockForUpdate()->first();
                if ($existing) {
                    foreach (['views', 'dwell_seconds', 'cart_adds', 'purchases'] as $column) {
                        $existing->{$column} += $row->{$column};
                    }
                    $existing->last_seen_at = max($existing->last_seen_at, $row->last_seen_at);
                    $existing->save();
                    $row->delete();
                } else {
                    $row->update(['visitor' => $userKey, 'user_id' => $user->id]);
                }
            }
            Offer::where('visitor', $guestKey)->active()->update(['visitor' => $userKey, 'user_id' => $user->id]);
        });
        OfferEngine::forget($userKey);
        OfferEngine::forget($guestKey);
    }

    private function bump(int $productId, array $increments, bool $touch = true, ?string $visitor = null, ?int $userId = null, bool $purchased = false): void
    {
        try {
            $visitor ??= $this->visitor->key();
            $userId ??= $this->visitor->userId();
            $row = ProductInteraction::firstOrCreate(
                ['visitor' => $visitor, 'product_id' => $productId],
                ['user_id' => $userId, 'last_seen_at' => now()],
            );
            $extra = array_filter([
                'last_seen_at' => $touch ? now() : null,
                'last_purchased_at' => $purchased ? now() : null,
            ]);
            foreach ($increments as $column => $by) {
                // Atomic increment: concurrent tabs can't lose counts.
                ProductInteraction::whereKey($row->id)->increment($column, $by, $extra);
                $extra = [];
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
