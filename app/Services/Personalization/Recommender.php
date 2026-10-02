<?php

namespace App\Services\Personalization;

use App\Models\Product;
use App\Models\ProductInteraction;
use Illuminate\Support\Collection;

/**
 * Personal product rails, learnt from what the visitor looked at, lingered on, bagged and bought.
 * Each interaction scores its category; the store then surfaces in-stock products from the
 * strongest categories that the visitor hasn't bought yet.
 */
class Recommender
{
    public function __construct(private readonly Visitor $visitor) {}

    /** @return Collection<int, ProductInteraction> */
    private function history(string $visitor): Collection
    {
        return ProductInteraction::with('product.brand', 'product.category')
            ->where('visitor', $visitor)
            ->latest('last_seen_at')
            ->limit(200)
            ->get()
            ->filter(fn ($r) => $r->product);
    }

    public static function score(ProductInteraction $r): float
    {
        return $r->views + min($r->dwell_seconds, 600) / 30 + $r->cart_adds * 3 + $r->purchases * 5;
    }

    /** @return array{for_you: list<array>, buy_again: list<array>, top_categories: list<string>} */
    public function rails(int $limit = 10): array
    {
        $visitor = $this->visitor->key();
        $history = $this->history($visitor);
        if ($history->isEmpty()) {
            return ['for_you' => [], 'buy_again' => [], 'top_categories' => []];
        }

        $categories = $history->groupBy(fn ($r) => $r->product->category_id)
            ->map(fn ($rows) => $rows->sum(fn ($r) => self::score($r)))
            ->sortDesc();
        $seen = $history->pluck('product_id')->all();
        $bought = $history->where('purchases', '>', 0)->pluck('product_id')->all();

        $forYou = Product::with('brand', 'category')
            ->listed()->inStock()
            ->whereIn('category_id', $categories->keys()->take(4))
            ->whereNotIn('id', $bought)
            ->orderByRaw('CASE category_id '.collect($categories->keys()->take(4))->map(fn ($id, $i) => 'WHEN '.(int) $id.' THEN '.$i)->implode(' ').' END')
            ->orderByRaw('id IN ('.implode(',', array_map('intval', $seen ?: [0])).') ASC')
            ->orderByDesc('is_featured')
            ->limit($limit)
            ->get();

        $buyAgain = $history->where('purchases', '>', 0)
            ->sortByDesc(fn ($r) => [$r->purchases, $r->last_purchased_at])
            ->pluck('product')
            ->filter(fn ($p) => $p->image_path)
            ->take($limit);

        return [
            'for_you' => $forYou->map->toCard()->values()->all(),
            'buy_again' => $buyAgain->map->toCard()->values()->all(),
            'top_categories' => $history->pluck('product.category.name', 'product.category_id')
                ->only($categories->keys()->take(3)->all())->values()->all(),
        ];
    }
}
