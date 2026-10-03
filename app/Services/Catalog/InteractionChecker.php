<?php

namespace App\Services\Catalog;

use App\Models\Product;
use Illuminate\Support\Collection;

/**
 * Drug-interaction warnings for a bag, built from the active ingredients already stored on every
 * product (`products.generics`, e.g. "Hyoscine Butylbromide , Paracetamol").
 *
 * Ingredients are matched to drug classes and conservative, well-established class pairs come
 * from resources/content/interactions.json. Only medicines taken by mouth or injection count:
 * creams, shampoos, eye drops and the like are ignored, so a ketoconazole shampoo never warns
 * about a statin. Warnings inform; they never block the sale, and the pharmacist sees them too.
 */
class InteractionChecker
{
    public const SYSTEMIC_FORMS = ['tablet', 'capsule', 'syrup', 'sachet', 'powder', 'injection', 'other'];

    private ?array $data = null;

    /**
     * @param  iterable<Product>  $products
     * @return list<array{severity: string, title: string, detail: string, advice: string, products: list<string>}>
     */
    public function check(iterable $products): array
    {
        $classified = collect($products)
            ->unique('id')
            ->filter(fn (Product $p) => in_array($p->form, self::SYSTEMIC_FORMS, true))
            ->map(fn (Product $p) => ['product' => $p, 'classes' => $this->classesFor((string) $p->generics)])
            ->filter(fn ($row) => $row['classes'] !== [])
            ->values();

        $warnings = [];
        foreach ($this->data()['rules'] as $rule) {
            foreach ($classified as $i => $x) {
                foreach ($classified as $j => $y) {
                    if ($i >= $j) {
                        continue;
                    }
                    $hit = (in_array($rule['a'], $x['classes'], true) && in_array($rule['b'], $y['classes'], true))
                        || (in_array($rule['b'], $x['classes'], true) && in_array($rule['a'], $y['classes'], true));
                    if (! $hit) {
                        continue;
                    }
                    $names = [$x['product']->name, $y['product']->name];
                    sort($names);
                    $key = $rule['title'].'|'.implode('|', $names);
                    $warnings[$key] ??= [
                        'severity' => $rule['severity'],
                        'title' => $rule['title'],
                        'detail' => $rule['detail'],
                        'advice' => $rule['advice'],
                        'products' => $names,
                    ];
                }
            }
        }

        return collect($warnings)->sortBy(fn ($w) => $w['severity'] === 'major' ? 0 : 1)->values()->all();
    }

    public static function hasMajor(array $warnings): bool
    {
        return collect($warnings)->contains('severity', 'major');
    }

    /** @return list<string> class keys an ingredient list belongs to */
    public function classesFor(string $generics): array
    {
        $classes = [];
        foreach (self::ingredients($generics) as $ingredient) {
            foreach ($this->data()['classes'] as $key => $class) {
                foreach ($class['patterns'] as $pattern) {
                    if (preg_match('/'.$pattern.'/u', $ingredient)) {
                        $classes[$key] = true;
                        break;
                    }
                }
            }
        }

        return array_keys($classes);
    }

    /** "Hyoscine Butylbromide , Paracetamol" → ["hyoscine butylbromide", "paracetamol"] */
    public static function ingredients(string $generics): array
    {
        $generics = strtolower(trim($generics));
        if ($generics === '' || $generics === 'none') {
            return [];
        }

        return collect(preg_split('/\s*[,+\/&;]\s*|\s+and\s+|\s+with\s+/u', $generics))
            ->map(fn ($s) => trim(preg_replace('/[^\pL\pN\s().\-]/u', ' ', $s)))
            ->map(fn ($s) => trim(preg_replace('/\s+/', ' ', $s)))
            ->filter()
            ->values()
            ->all();
    }

    private function data(): array
    {
        return $this->data ??= json_decode((string) file_get_contents(resource_path('content/interactions.json')), true);
    }

    /** @param  Collection<int, array{product: Product}>  $lines */
    public function forLines(Collection $lines): array
    {
        return $this->check($lines->pluck('product'));
    }
}
