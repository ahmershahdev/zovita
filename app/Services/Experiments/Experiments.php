<?php

namespace App\Services\Experiments;

use App\Models\ExperimentEvent;
use App\Services\Personalization\Visitor;
use Illuminate\Support\Facades\DB;

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

        // A variant already shown to this visitor wins over the hash (it may have been carried over
        // from the guest they were before signing in — see mergeGuestInto()).
        $stored = $this->stored($visitor)[$experiment] ?? null;
        if ($stored && in_array($stored, $variants, true)) {
            return $stored;
        }

        return $variants[crc32($visitor.'|'.$experiment) % count($variants)];
    }

    /** @var array<string, array<string, string>> per-request cache of stored assignments */
    private array $stored = [];

    /** @return array<string, string> experiment → variant persisted for a visitor */
    private function stored(string $visitor): array
    {
        return $this->stored[$visitor] ??= DB::table('experiment_assignments')->where('visitor', $visitor)->pluck('variant', 'experiment')->all();
    }

    /**
     * Sign-in keeps the variant the shopper already saw as a guest. For each experiment the guest
     * was exposed to: if the account has no variant of its own yet, it adopts the guest's and the
     * guest's events move to the account; if the account already has one (another device), the
     * account's wins and the guest's events stay where they were, so no one is counted twice.
     */
    public function mergeGuestInto(?string $guestKey, string $userKey): void
    {
        if (! $guestKey || $guestKey === $userKey) {
            return;
        }
        $guest = DB::table('experiment_assignments')->where('visitor', $guestKey)->pluck('variant', 'experiment');
        if ($guest->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($guest, $guestKey, $userKey) {
            $user = DB::table('experiment_assignments')->where('visitor', $userKey)->lockForUpdate()->pluck('variant', 'experiment');
            foreach ($guest as $experiment => $variant) {
                $userHasEvents = ExperimentEvent::where('visitor', $userKey)->where('experiment', $experiment)->exists();
                if ($user->has($experiment) || $userHasEvents) {
                    continue;
                }
                DB::table('experiment_assignments')->insertOrIgnore(['visitor' => $userKey, 'experiment' => $experiment, 'variant' => $variant, 'created_at' => now()]);
                foreach (ExperimentEvent::where('visitor', $guestKey)->where('experiment', $experiment)->get() as $event) {
                    ExperimentEvent::insertOrIgnore(['experiment' => $experiment, 'variant' => $event->variant, 'event' => $event->event, 'visitor' => $userKey, 'created_at' => $event->created_at]);
                }
                ExperimentEvent::where('visitor', $guestKey)->where('experiment', $experiment)->delete();
                DB::table('experiment_assignments')->where('visitor', $guestKey)->where('experiment', $experiment)->delete();
            }
        });
        unset($this->stored[$guestKey], $this->stored[$userKey]);
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
            if ($event === 'exposure') {
                // Remember what this visitor was shown, so it survives sign-in.
                DB::table('experiment_assignments')->insertOrIgnore(['visitor' => $visitor, 'experiment' => $experiment, 'variant' => $variant, 'created_at' => now()]);
                $this->stored[$visitor][$experiment] ??= $variant;
            }
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
