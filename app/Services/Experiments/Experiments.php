<?php

namespace App\Services\Experiments;

use App\Models\ExperimentEvent;
use App\Services\Personalization\Visitor;

/**
 * Minimal A/B testing. Experiments are declared in config('zovita.experiments'); each visitor is
 * assigned a variant deterministically (hash of visitor + experiment, so it is stable across
 * visits and devices once signed in, with no extra storage). Events are de-duplicated per visitor,
 * so the admin dashboard reads unique conversion rates: exposure → click → add_to_cart → purchase.
 */
class Experiments
{
    public const EVENTS = ['exposure', 'click', 'add_to_cart', 'purchase'];

    public function __construct(private readonly Visitor $visitor) {}

    /** @return array<string, array{variants: list<string>, description?: string}> */
    public static function definitions(): array
    {
        return config('zovita.experiments', []);
    }

    public function variant(string $experiment, ?string $visitor = null): ?string
    {
        $variants = self::definitions()[$experiment]['variants'] ?? null;
        if (! $variants) {
            return null;
        }
        $visitor ??= $this->visitor->key();

        return $variants[crc32($visitor.'|'.$experiment) % count($variants)];
    }

    /** @return array<string, string> every experiment → this visitor's variant */
    public function assignments(): array
    {
        $visitor = $this->visitor->key();

        return collect(self::definitions())->keys()->mapWithKeys(fn ($name) => [$name => $this->variant($name, $visitor)])->all();
    }

    public function track(string $experiment, string $event, ?string $visitor = null): void
    {
        $visitor ??= $this->visitor->key();
        $variant = $this->variant($experiment, $visitor);
        if (! $variant || ! in_array($event, self::EVENTS, true)) {
            return;
        }
        try {
            ExperimentEvent::insertOrIgnore([
                'experiment' => $experiment,
                'variant' => $variant,
                'event' => $event,
                'visitor' => $visitor,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Credit a conversion to every running experiment (called after an order is placed). */
    public function trackAll(string $event, ?string $visitor = null): void
    {
        foreach (array_keys(self::definitions()) as $experiment) {
            $this->track($experiment, $event, $visitor);
        }
    }

    /** Per-variant funnel for the admin dashboard. */
    public static function report(): array
    {
        $rows = ExperimentEvent::selectRaw('experiment, variant, event, COUNT(*) as total')
            ->groupBy('experiment', 'variant', 'event')->get();

        return collect(self::definitions())->map(function ($def, $name) use ($rows) {
            $variants = collect($def['variants'])->map(function ($variant) use ($rows, $name) {
                $count = fn ($event) => (int) ($rows->first(fn ($r) => $r->experiment === $name && $r->variant === $variant && $r->event === $event)?->total ?? 0);
                $exposure = $count('exposure');

                return [
                    'variant' => $variant,
                    'exposure' => $exposure,
                    'click' => $count('click'),
                    'add_to_cart' => $count('add_to_cart'),
                    'purchase' => $count('purchase'),
                    'conversion' => $exposure ? round($count('purchase') / $exposure * 100, 2) : 0,
                    'ctr' => $exposure ? round($count('click') / $exposure * 100, 2) : 0,
                ];
            })->values()->all();

            return ['name' => $name, 'description' => $def['description'] ?? '', 'variants' => $variants];
        })->values()->all();
    }
}
