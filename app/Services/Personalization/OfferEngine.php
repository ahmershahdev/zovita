<?php

namespace App\Services\Personalization;

use App\Enums\OrderStatus;
use App\Models\Offer;
use App\Models\Order;
use App\Models\ProductInteraction;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Turns behaviour into automatic, personal discounts. The store "learns" from each visitor:
 *
 *   hesitation   viewed a product 3+ times or for 45s+ without buying     8% on it, 72h
 *   cart_rescue  added it to the bag a day ago but never bought it          5% on it, 48h
 *   regular      bought the same product 2+ times                          10% on it, 7 days
 *   welcome      signed-up customer with no orders yet                      5% order, 14 days
 *   loyalty      3+ orders (10% at 8+)                                     5–10% order, 30 days
 *   comeback     has ordered before but not in 45 days                      7% order, 10 days
 *
 * Rules are evaluated at most every few minutes per visitor and never duplicate a live offer.
 * Discounts are applied (and capped) by Pricing, and re-validated under lock at checkout.
 */
class OfferEngine
{
    public const MAX_PRODUCT_OFFERS = 4;

    public function __construct(private readonly Visitor $visitor) {}

    public static function forget(string $visitor): void
    {
        Cache::forget("offers.{$visitor}");
        Cache::forget("offers.evaluated.{$visitor}");
    }

    /** @return Collection<int, Offer> live offers for the current visitor (cached briefly) */
    public function active(?string $visitor = null): Collection
    {
        $visitor ??= $this->visitor->key();
        $this->evaluate($visitor);

        return Cache::remember("offers.{$visitor}", 300, fn () => Offer::with('product:id,name,slug')
            ->where('visitor', $visitor)->active()->orderByDesc('percent')->get());
    }

    /** Re-run the rules for a visitor (throttled to once per 5 minutes unless forced). */
    public function evaluate(?string $visitor = null, bool $force = false): void
    {
        $visitor ??= $this->visitor->key();
        if (! $force && ! Cache::add("offers.evaluated.{$visitor}", 1, 300)) {
            return;
        }

        $user = str_starts_with($visitor, 'u:') ? User::find((int) substr($visitor, 2)) : null;
        $live = Offer::where('visitor', $visitor)->active()->get();
        $has = fn (string $kind, ?int $productId = null) => $live->contains(fn (Offer $o) => $o->kind === $kind && $o->product_id === $productId);
        $created = false;
        $make = function (string $kind, int $percent, string $reason, int $hours, ?int $productId = null) use ($visitor, $user, $has, &$created, $live) {
            if ($has($kind, $productId)) {
                return;
            }
            if ($productId && $live->whereNotNull('product_id')->count() >= self::MAX_PRODUCT_OFFERS) {
                return;
            }
            $live->push(Offer::create([
                'visitor' => $visitor,
                'user_id' => $user?->id,
                'product_id' => $productId,
                'kind' => $kind,
                'percent' => $percent,
                'reason' => $reason,
                'expires_at' => now()->addHours($hours),
            ]));
            $created = true;
        };

        $rows = ProductInteraction::with('product:id,name,stock,image_path')
            ->where('visitor', $visitor)
            ->where('last_seen_at', '>=', now()->subDays(30))
            ->get()
            ->filter(fn ($r) => $r->product && $r->product->stock > 0 && $r->product->image_path);

        // A product already redeemed with an offer recently shouldn't immediately get another.
        $recentlyRedeemed = Offer::where('visitor', $visitor)->whereNotNull('redeemed_at')
            ->where('redeemed_at', '>=', now()->subDays(14))->pluck('product_id')->filter()->all();

        foreach ($rows->sortByDesc('dwell_seconds') as $row) {
            if (in_array($row->product_id, $recentlyRedeemed, true)) {
                continue;
            }
            if ($row->purchases >= 2) {
                $make('regular', 10, "You've bought {$row->product->name} {$row->purchases} times", 24 * 7, $row->product_id);
            } elseif ($row->purchases === 0 && $row->cart_adds > 0 && $row->last_seen_at <= now()->subDay()) {
                $make('cart_rescue', 5, "{$row->product->name} is still waiting in your bag", 48, $row->product_id);
            } elseif ($row->purchases === 0 && ($row->views >= 3 || $row->dwell_seconds >= 45)) {
                $make('hesitation', 8, "You've been looking at {$row->product->name}", 72, $row->product_id);
            }
        }

        if ($user) {
            $orders = Order::where('user_id', $user->id)->where('status', '!=', OrderStatus::Cancelled)->get(['id', 'created_at']);
            $count = $orders->count();
            if ($count === 0 && $user->created_at >= now()->subDays(60)) {
                $make('welcome', 5, 'Welcome to Zovita — 5% off your first order', 24 * 14);
            } elseif ($count >= 3) {
                $make('loyalty', $count >= 8 ? 10 : 5, "Thanks for {$count} orders with us", 24 * 30);
            }
            if ($count > 0 && $orders->max('created_at') <= now()->subDays(45)) {
                $make('comeback', 7, "It's been a while — here's something to welcome you back", 24 * 10);
            }
        }

        if ($created) {
            Cache::forget("offers.{$visitor}");
        }
    }
}
