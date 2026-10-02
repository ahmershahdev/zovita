<?php

namespace App\Services\Personalization;

use App\Enums\OrderStatus;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Models\RefillReminder;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Refill reminders for medicines a customer buys again and again.
 *
 * Candidates come from the "regular" signal personalisation already keeps (product_interactions
 * with 2+ purchases). For each, the customer's real order dates give the rhythm: the median gap
 * between purchases (clamped to 7–120 days) predicts when they'll run out. One reminder row is kept
 * per purchase cycle (unique user + product + last purchase), so the e-mail goes out at most once
 * per cycle and buying again starts a new cycle by itself.
 */
class Refills
{
    public const MIN_DAYS = 7;

    public const MAX_DAYS = 120;

    /** Remind this many days before the predicted run-out. */
    public const LEAD_DAYS = 3;

    /** Stop nudging once a refill is this overdue. */
    public const STALE_DAYS = 14;

    /** @return Collection<int, RefillReminder> the current cycle's reminder for each regular product */
    public function sync(User $user): Collection
    {
        $productIds = ProductInteraction::where('visitor', 'u:'.$user->id)->where('purchases', '>=', 2)->pluck('product_id');
        if ($productIds->isEmpty()) {
            return collect();
        }

        $purchases = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.user_id', $user->id)
            ->whereIn('order_items.product_id', $productIds)
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->whereNotIn('orders.payment_status', ['pending', 'expired', 'failed'])
            ->orderBy('orders.created_at')
            ->get(['order_items.product_id', 'orders.created_at'])
            ->groupBy('product_id');

        $reminders = collect();
        foreach ($purchases as $productId => $rows) {
            $days = $rows->map(fn ($r) => Carbon::parse($r->created_at)->startOfDay())->unique(fn ($d) => $d->toDateString())->values();
            if ($days->count() < 2) {
                continue;
            }
            $interval = $this->interval($days);
            $last = $days->last();

            $reminders->push(RefillReminder::firstOrCreate(
                ['user_id' => $user->id, 'product_id' => (int) $productId, 'last_purchased_at' => $last],
                ['due_at' => $last->copy()->addDays($interval), 'interval_days' => $interval],
            ));
        }

        return $reminders;
    }

    /** Refills to show on the account page: due within a week (or recently overdue), in stock. */
    public function upcoming(User $user, int $withinDays = 7): Collection
    {
        return (new EloquentCollection($this->sync($user)->all()))
            ->filter(fn (RefillReminder $r) => ! $r->dismissed_at
                && $r->due_at->lte(now()->addDays($withinDays))
                && $r->due_at->gte(now()->subDays(self::STALE_DAYS)))
            ->load('product')
            ->filter(fn (RefillReminder $r) => $r->product && $r->product->stock > 0)
            ->sortBy('due_at')
            ->values();
    }

    /** Reminders the daily job should e-mail now (claims each one so it is sent only once). */
    public function claimDue(User $user): Collection
    {
        return $this->upcoming($user, self::LEAD_DAYS)
            ->filter(fn (RefillReminder $r) => RefillReminder::whereKey($r->id)->whereNull('sent_at')->update(['sent_at' => now()]) === 1)
            ->values();
    }

    /** Quantity to put back in the bag: what they bought last time, within the per-order cap. */
    public function lastQuantity(RefillReminder $reminder): int
    {
        $qty = (int) DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.user_id', $reminder->user_id)->where('order_items.product_id', $reminder->product_id)
            ->latest('orders.created_at')->value('order_items.quantity');

        return max(1, min($qty ?: 1, $reminder->product?->orderableLimit() ?: 1));
    }

    public function toClient(RefillReminder $r): array
    {
        return [
            'id' => $r->id,
            'product' => $r->product instanceof Product ? $r->product->toCard() : null,
            'due_at' => $r->due_at->toIso8601String(),
            'interval_days' => $r->interval_days,
            'overdue' => $r->due_at->isPast(),
        ];
    }

    /** Median gap in days between distinct purchase days. */
    private function interval(Collection $days): int
    {
        $gaps = [];
        for ($i = 1; $i < $days->count(); $i++) {
            $gaps[] = $days[$i - 1]->diffInDays($days[$i]);
        }
        sort($gaps);
        $n = count($gaps);
        $median = $n % 2 ? $gaps[intdiv($n, 2)] : ($gaps[$n / 2 - 1] + $gaps[$n / 2]) / 2;

        return (int) max(self::MIN_DAYS, min(self::MAX_DAYS, round($median)));
    }
}
