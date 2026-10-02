<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A ban decision. Severity decides what is blocked (see App\Services\Security\BanGuard):
 *   temporary  the account is locked until expires_at; its email/phone/device can't sign up meanwhile
 *   permanent  the account is closed; its email, phone, device and fingerprint can never sign up
 *   deep       permanent + the IP address and its network range are blocked from the whole site
 */
class Ban extends Model
{
    public const SEVERITIES = ['temporary', 'permanent', 'deep'];

    protected $fillable = ['user_id', 'severity', 'reason', 'expires_at', 'created_by', 'lifted_at', 'lifted_by'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'lifted_at' => 'datetime'];
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereNull('lifted_at')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    public function isActive(): bool
    {
        return $this->lifted_at === null && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lifter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lifted_by');
    }

    public function identifiers(): HasMany
    {
        return $this->hasMany(BanIdentifier::class);
    }

    public function label(): string
    {
        return match ($this->severity) {
            'temporary' => 'Temporary ban',
            'permanent' => 'Permanent ban',
            'deep' => 'Deep ban (account, device & network)',
            default => 'Ban',
        };
    }
}
