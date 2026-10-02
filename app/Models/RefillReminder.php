<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefillReminder extends Model
{
    protected $fillable = ['user_id', 'product_id', 'last_purchased_at', 'due_at', 'interval_days', 'sent_at', 'dismissed_at'];

    protected function casts(): array
    {
        return ['last_purchased_at' => 'datetime', 'due_at' => 'datetime', 'sent_at' => 'datetime', 'dismissed_at' => 'datetime', 'interval_days' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
