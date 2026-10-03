<?php

namespace App\Models;

use App\Enums\PrescriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Prescription extends Model
{
    protected $fillable = ['user_id', 'reference', 'name', 'email', 'phone', 'file_path', 'original_name', 'scan_status', 'notes', 'status', 'reviewed_by', 'reviewed_at', 'review_note', 'auto_approved'];

    /** Undecided prescriptions are approved automatically after this many hours. */
    public const AUTO_APPROVE_HOURS = 24;

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return ['status' => PrescriptionStatus::class, 'reviewed_at' => 'datetime', 'auto_approved' => 'boolean'];
    }

    public static function generateReference(): string
    {
        do {
            $reference = 'RX-'.Str::upper(Str::random(8));
        } while (static::where('reference', $reference)->exists());

        return $reference;
    }

    public function isPending(): bool
    {
        return in_array($this->status, [PrescriptionStatus::Received, PrescriptionStatus::Reviewing], true);
    }

    /** When an undecided prescription will be approved automatically. */
    public function autoDecisionAt(): ?Carbon
    {
        return $this->isPending() ? $this->created_at->copy()->addHours(self::AUTO_APPROVE_HOURS) : null;
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
