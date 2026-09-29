<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'prescription_id', 'number', 'status', 'customer_name', 'email', 'phone', 'address', 'city',
        'postal_code', 'notes', 'payment_method', 'subtotal', 'savings', 'delivery_fee', 'total',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'subtotal' => 'float',
            'savings' => 'float',
            'delivery_fee' => 'float',
            'total' => 'float',
        ];
    }

    public static function generateNumber(): string
    {
        do {
            $number = 'ZV-'.now()->format('ymd').'-'.Str::upper(Str::random(5));
        } while (static::where('number', $number)->exists());

        return $number;
    }

    public function getRouteKeyName(): string
    {
        return 'number';
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function toSummary(): array
    {
        return [
            'number' => $this->number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'total' => $this->total,
            'items_count' => (int) (array_key_exists('items_count', $this->attributes)
                ? $this->attributes['items_count']
                : $this->items->sum('quantity')),
            'placed_at' => $this->created_at->toIso8601String(),
        ];
    }

    public function toDetail(): array
    {
        $reached = array_search($this->status, OrderStatus::timeline(), true);

        return $this->toSummary() + [
            'customer_name' => $this->customer_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'city' => $this->city,
            'notes' => $this->notes,
            'payment_method' => $this->payment_method,
            'subtotal' => $this->subtotal,
            'savings' => $this->savings,
            'delivery_fee' => $this->delivery_fee,
            'timeline' => collect(OrderStatus::timeline())->map(fn (OrderStatus $step, int $i) => [
                'key' => $step->value,
                'label' => $step->label(),
                'done' => $reached !== false && $i <= $reached,
            ])->all(),
            'items' => $this->items->map(fn (OrderItem $item) => [
                'name' => $item->name,
                'slug' => $item->slug,
                'image' => $item->image,
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'line_total' => $item->line_total,
            ])->all(),
        ];
    }
}
