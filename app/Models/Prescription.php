<?php

namespace App\Models;

use App\Enums\PrescriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Prescription extends Model
{
    protected $fillable = ['user_id', 'reference', 'name', 'email', 'phone', 'file_path', 'original_name', 'notes', 'status'];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return ['status' => PrescriptionStatus::class];
    }

    public static function generateReference(): string
    {
        do {
            $reference = 'RX-'.Str::upper(Str::random(8));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
