<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    public const PENDING = 'pending';

    public const PAID = 'paid';

    public const FAILED = 'failed';

    public const EXPIRED = 'expired';

    public const REFUNDED = 'refunded';

    public const PARTIALLY_REFUNDED = 'partially_refunded';

    protected $fillable = ['order_id', 'provider', 'reference', 'intent', 'status', 'amount', 'refunded_amount', 'currency', 'checkout_url', 'paid_at'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'refunded_amount' => 'float', 'paid_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function refundable(): float
    {
        return in_array($this->status, [self::PAID, self::PARTIALLY_REFUNDED], true) ? round($this->amount - $this->refunded_amount, 2) : 0.0;
    }
}
