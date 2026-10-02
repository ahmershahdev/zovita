<?php

namespace App\Services\Personalization;

use App\Models\Offer;
use App\Models\Product;
use Illuminate\Support\Collection;

/**
 * Applies personal offers to a set of bag lines. Used for the bag preview and, inside the
 * checkout transaction, for the amount actually charged — the same function both times, so what
 * the customer sees is what they pay.
 *
 *  - each line gets the best live offer for that product
 *  - then the best order-wide offer applies to what is left
 *  - the total personal discount is capped at MAX_SHARE of the payable amount
 */
class Pricing
{
    public const MAX_SHARE = 0.15;

    /**
     * @param  iterable<array{product: Product, quantity: int}>  $lines
     * @param  Collection<int, Offer>  $offers
     * @return array{discount: float, lines: array<int, float>, used: list<int>, order_offer: ?Offer}
     */
    public static function apply(iterable $lines, Collection $offers): array
    {
        $byProduct = $offers->whereNotNull('product_id')->groupBy('product_id')->map(fn ($g) => $g->sortByDesc('percent')->first());
        $orderOffer = $offers->whereNull('product_id')->sortByDesc('percent')->first();

        $payable = 0.0;
        $lineDiscounts = [];
        $used = [];
        foreach ($lines as $line) {
            $amount = $line['product']->current_price * $line['quantity'];
            $payable += $amount;
            if ($offer = $byProduct->get($line['product']->id)) {
                $lineDiscounts[$line['product']->id] = round($amount * $offer->percent / 100, 2);
                $used[] = $offer->id;
            }
        }

        $discount = array_sum($lineDiscounts);
        if ($orderOffer && $payable > 0) {
            $discount += ($payable - $discount) * $orderOffer->percent / 100;
            $used[] = $orderOffer->id;
        }

        $cap = $payable * self::MAX_SHARE;

        return [
            'discount' => round(min($discount, $cap), 2),
            'lines' => $lineDiscounts,
            'used' => $used,
            'order_offer' => $orderOffer,
        ];
    }
}
