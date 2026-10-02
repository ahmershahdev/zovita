<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Support\Username;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = ['name', 'email', 'password', 'phone', 'city', 'address', 'lat', 'lng', 'locale'];

    /** @var list<string> */
    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'banned_at' => 'datetime',
            'banned_until' => 'datetime',
            'last_login_at' => 'datetime',
            'lat' => 'float',
            'lng' => 'float',
            'last_seen_at' => 'datetime',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function wishlist(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'wishlist_items')->withTimestamps();
    }

    /** Every account gets a permanent, readable username (only admins can change it). */
    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->username ??= Username::generate();
        });
    }

    /** Banned now? Temporary bans end on their own once `banned_until` passes. */
    public function isBanned(): bool
    {
        $attrs = $this->getAttributes();
        if (empty($attrs['banned_at'] ?? null)) {
            return false;
        }
        $until = $attrs['banned_until'] ?? null;

        return $until === null || Carbon::parse($until)->isFuture();
    }

    public function avatarUrl(): ?string
    {
        $path = $this->getAttributes()['avatar_path'] ?? null;

        return $path ? asset('storage/'.$path) : null;
    }

    public function bans(): HasMany
    {
        return $this->hasMany(Ban::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(UserActivity::class);
    }

    public function isAdmin(): bool
    {
        return (bool) ($this->getAttributes()['is_admin'] ?? false) && ! $this->isBanned();
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
