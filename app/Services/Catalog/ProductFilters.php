<?php

namespace App\Services\Catalog;

use App\Models\Department;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Turns shop query-string filters into an Eloquent query and facet counts.
 * All inputs are whitelisted; anything unknown is ignored.
 */
class ProductFilters
{
    public const SORTS = [
        'featured' => 'Featured',
        'price_asc' => 'Price: low to high',
        'price_desc' => 'Price: high to low',
        'discount' => 'Biggest savings',
        'name' => 'Name A–Z',
    ];

    public array $values;

    public function __construct(Request $request, public readonly ?Department $department = null)
    {
        // Query values can be arrays (?category[]=x); only accept scalar strings.
        $string = fn (string $key, int $max = 80) => is_string($value = $request->query($key))
            ? mb_substr(trim($value), 0, $max)
            : '';
        $number = fn (string $key) => is_numeric($value = $request->query($key)) ? max(0, (int) $value) : null;
        $sort = $string('sort');

        $this->values = [
            'q' => $string('q'),
            'category' => $string('category'),
            'brand' => $string('brand'),
            'form' => $string('form', 32),
            'rx' => in_array($string('rx'), ['otc', 'rx'], true) ? $string('rx') : '',
            'in_stock' => $request->boolean('in_stock'),
            'min' => $number('min'),
            'max' => $number('max'),
            'sort' => array_key_exists($sort, self::SORTS) ? $sort : 'featured',
        ];
    }

    /** Base scope: department + search. Facets are counted inside this scope. */
    public function scoped(): Builder
    {
        return Product::query()
            ->when($this->department, fn (Builder $q) => $q->where('products.department_id', $this->department->id))
            ->search($this->values['q']);
    }

    public function query(): Builder
    {
        $v = $this->values;
        $price = 'COALESCE(sale_price, price)';

        $query = $this->scoped()
            ->with('brand', 'category')
            ->when($v['category'], fn (Builder $q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($v['brand'], fn (Builder $q, $slug) => $q->whereHas('brand', fn ($b) => $b->where('slug', $slug)))
            ->when($v['form'], fn (Builder $q, $form) => $q->where('form', $form))
            ->when($v['rx'] === 'rx', fn (Builder $q) => $q->where('requires_prescription', true))
            ->when($v['rx'] === 'otc', fn (Builder $q) => $q->where('requires_prescription', false))
            ->when($v['in_stock'], fn (Builder $q) => $q->inStock())
            ->when($v['min'] !== null, fn (Builder $q) => $q->whereRaw("{$price} >= ?", [$v['min']]))
            ->when($v['max'] !== null, fn (Builder $q) => $q->whereRaw("{$price} <= ?", [$v['max']]));

        return match ($v['sort']) {
            'price_asc' => $query->orderByRaw("{$price} ASC"),
            'price_desc' => $query->orderByRaw("{$price} DESC"),
            'discount' => $query->orderByRaw('COALESCE((price - sale_price) / price, 0) DESC'),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('is_featured')->orderByRaw('stock > 0 DESC')->orderBy('id'),
        };
    }

    public function facets(): array
    {
        $count = fn (string $relation, string $table) => $this->scoped()
            ->join($table, "{$table}.id", '=', "products.{$relation}_id")
            ->selectRaw("{$table}.name, {$table}.slug, COUNT(*) as count")
            ->groupBy("{$table}.id", "{$table}.name", "{$table}.slug")
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'slug' => $row->slug, 'count' => (int) $row->count])
            ->all();

        return [
            'categories' => $count('category', 'categories'),
            'brands' => array_slice($count('brand', 'brands'), 0, 30),
            'forms' => $this->scoped()->selectRaw('products.form, COUNT(*) as count')->groupBy('products.form')->orderByDesc('count')
                ->get()->map(fn ($r) => ['slug' => $r->form, 'name' => ucfirst($r->form), 'count' => (int) $r->count])->all(),
            'sorts' => collect(self::SORTS)->map(fn ($label, $key) => ['value' => $key, 'label' => $label])->values()->all(),
        ];
    }
}
