<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One line in a customer's activity timeline (sign-ins, orders, profile changes…). */
class UserActivity extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'type', 'description', 'ip', 'user_agent', 'device', 'fingerprint', 'meta'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
