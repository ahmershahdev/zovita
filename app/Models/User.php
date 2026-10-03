<?php

namespace App\Models;

use App\Enums\StaffRole;
use App\Mail\NoticeMail;
use App\Notifications\ResetPasswordNotification;
use App\Services\Mail\TransactionalMailer;
use App\Support\Username;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = ['name', 'email', 'password', 'phone', 'city', 'address', 'lat', 'lng', 'locale'];

    /** @var list<string> */
    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

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
            'role' => StaffRole::class,
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'refill_reminders' => 'boolean',
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

    /** Staff = a known role and not banned. `is_admin` is kept in step with `role` (see setStaffRole). */
    public function isAdmin(): bool
    {
        return (bool) ($this->getAttributes()['is_admin'] ?? false) && $this->staffRole() !== null && ! $this->isBanned();
    }

    public function staffRole(): ?StaffRole
    {
        return StaffRole::tryFrom((string) ($this->getAttributes()['role'] ?? ''));
    }

    public function canStaff(string $permission): bool
    {
        return $this->isAdmin() && (bool) $this->staffRole()?->can($permission);
    }

    /** Grant a role (or remove staff access with null). Removing access also clears two-factor. */
    public function setStaffRole(?StaffRole $role): void
    {
        $this->forceFill(['role' => $role, 'is_admin' => $role !== null]);
        if ($role === null) {
            $this->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null]);
        }
        $this->save();
    }

    public function hasTwoFactor(): bool
    {
        $attributes = $this->getAttributes();

        return ! empty($attributes['two_factor_confirmed_at'] ?? null) && filled($attributes['two_factor_secret'] ?? null);
    }

    public function refillReminders(): HasMany
    {
        return $this->hasMany(RefillReminder::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /** Branded confirmation e-mail with a signed link that expires after 10 minutes. */
    public function sendEmailVerificationNotification(): void
    {
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(10), [
            'id' => $this->getKey(),
            'hash' => sha1($this->getEmailForVerification()),
        ]);
        app(TransactionalMailer::class)->send($this->email, new NoticeMail(
            title: 'Confirm your e-mail for Zovita',
            eyebrow: 'Confirm your e-mail',
            heading: 'One tap to confirm',
            lines: [
                'Hi '.strtok($this->name, ' ').', please confirm this is your e-mail address so order updates, prescription decisions and sign-in codes reach you.',
                'The link works once and expires in 10 minutes. You can ask for a new one from your account page.',
            ],
            buttonUrl: $url,
            buttonLabel: 'Confirm my e-mail',
        ));
    }
}
