<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BanIdentifier extends Model
{
    protected $fillable = ['ban_id', 'type', 'value'];

    public function ban(): BelongsTo
    {
        return $this->belongsTo(Ban::class);
    }
}
