<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** What one visitor did with one product: views, time on page, bag adds and purchases. */
class ProductInteraction extends Model
{
    protected $fillable = ['visitor', 'user_id', 'product_id', 'views', 'dwell_seconds', 'cart_adds', 'purchases', 'last_seen_at', 'last_purchased_at'];

    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime', 'last_purchased_at' => 'datetime'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
