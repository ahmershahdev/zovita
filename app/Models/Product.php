<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id', 'category_id', 'brand_id', 'name', 'slug', 'form', 'pack', 'price', 'sale_price',
        'stock', 'max_per_order', 'requires_prescription', 'is_featured', 'generics', 'summary', 'description',
        'indication', 'dosage', 'precautions', 'image_url', 'image_path', 'source_url',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'float',
            'sale_price' => 'float',
            'stock' => 'integer',
            'max_per_order' => 'integer',
            'requires_prescription' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /** Price the customer pays right now. */
    protected function currentPrice(): Attribute
    {
        return Attribute::get(fn () => $this->sale_price && $this->sale_price < $this->price ? $this->sale_price : $this->price);
    }

    protected function discountPercent(): Attribute
    {
        return Attribute::get(fn () => $this->sale_price && $this->sale_price < $this->price
            ? (int) round((1 - $this->sale_price / $this->price) * 100)
            : 0);
    }

    /** Locally cached image when available, otherwise the catalog source URL. */
    protected function image(): Attribute
    {
        return Attribute::get(fn () => $this->image_path
            ? asset('storage/'.$this->image_path)
            : $this->image_url);
    }

    /** Customers can never order more than stock or the per-order cap allows. */
    public function orderableLimit(): int
    {
        return max(0, min($this->stock, $this->max_per_order, (int) config('zovita.max_line_quantity')));
    }

    public function scopeInStock(Builder $query): void
    {
        $query->where('stock', '>', 0);
    }

    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->where($this->qualifyColumn('name'), 'like', $like)
            ->orWhere($this->qualifyColumn('generics'), 'like', $like)
            ->orWhereHas('brand', fn (Builder $b) => $b->where('brands.name', 'like', $like)));
    }

    /** Compact shape used by cards, rails, cart and search results. */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'brand' => $this->brand?->name,
            'category' => $this->category?->name,
            'form' => $this->form,
            'image' => $this->image,
            'price' => $this->price,
            'current_price' => $this->current_price,
            'discount_percent' => $this->discount_percent,
            'requires_prescription' => $this->requires_prescription,
            'in_stock' => $this->stock > 0,
            'max_quantity' => $this->orderableLimit(),
        ];
    }
}
