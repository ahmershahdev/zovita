<?php

namespace App\Services\Security;

use App\Models\Ban;
use App\Models\BanIdentifier;
use App\Models\User;
use App\Models\UserActivity;
use App\Services\Personalization\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Issues and enforces bans.
 *
 * Identity signals of a request:
 *   email     canonical form (lower-case; Gmail dots and "+tags" removed) so aliases can't slip through
 *   phone     digits only, with the leading country/trunk prefix normalised
 *   device    the long-lived first-party device cookie (zv_vid)
 *   fingerprint a hash of stable browser traits sent by the sign-up / sign-in forms
 *   ip        the exact address
 *   network   the /24 (IPv4) or /64 (IPv6) range around it
 *
 * Which signals a ban blocks depends on its severity:
 *   temporary  email, phone, device, fingerprint            (until it expires)
 *   permanent  email, phone, device, fingerprint            (forever)
 *   deep       all of the above + ip + network               (forever, and the whole site)
 */
class BanGuard
{
    public const DURATIONS = ['1d' => '1 day', '3d' => '3 days', '1w' => '1 week', '1m' => '1 month', '3m' => '3 months', '6m' => '6 months'];

    public function __construct(private readonly Visitor $visitor) {}

    public static function canonicalEmail(?string $email): ?string
    {
        if (! $email || ! str_contains($email, '@')) {
            return null;
        }
        [$local, $domain] = explode('@', strtolower(trim($email)), 2);
        $local = explode('+', $local)[0];
        if (in_array($domain, ['gmail.com', 'googlemail.com'], true)) {
            $local = str_replace('.', '', $local);
            $domain = 'gmail.com';
        }

        return $local.'@'.$domain;
    }

    public static function canonicalPhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);
        if (strlen($digits) < 7) {
            return null;
        }

        // 03001234567 / 923001234567 / 00923001234567 → 3001234567
        return ltrim(preg_replace('/^(00)?92/', '', $digits), '0');
    }

    public static function network(?string $ip): ?string
    {
        if (! $ip) {
            return null;
        }
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return implode('.', array_slice(explode('.', $ip), 0, 3)).'.0/24';
        }
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $packed = inet_pton($ip);

            return inet_ntop(substr($packed, 0, 8).str_repeat("\0", 8)).'/64';
        }

        return null;
    }

    /** Signals of the current request (plus optional form data). */
    public function signals(Request $request, ?string $email = null, ?string $phone = null): array
    {
        $fingerprint = $request->input('fp') ?: $request->session()->get('zv_fp');
        if (is_string($fingerprint) && preg_match('/^[a-f0-9]{16,64}$/', $fingerprint)) {
            $request->session()->put('zv_fp', $fingerprint);
        } else {
            $fingerprint = null;
        }

        return array_filter([
            'email' => self::canonicalEmail($email),
            'phone' => self::canonicalPhone($phone),
            'device' => $this->visitor->guestKey() ? substr($this->visitor->guestKey(), 2) : null,
            'fingerprint' => $fingerprint,
            'ip' => $request->ip(),
            'network' => self::network($request->ip()),
        ]);
    }

    /**
     * The active ban (if any) matching these signals. IP and network matches only count for deep
     * bans. With `$siteWide`, only deep bans are considered (they block the whole site).
     */
    public function match(array $signals, bool $siteWide = false): ?Ban
    {
        if (! $signals) {
            return null;
        }

        $hits = BanIdentifier::with('ban')
            ->where(function ($q) use ($signals) {
                foreach ($signals as $type => $value) {
                    $q->orWhere(fn ($w) => $w->where('type', $type)->where('value', (string) $value));
                }
            })
            ->whereHas('ban', fn ($q) => $q->active())
            ->get();

        return $hits
            ->filter(fn (BanIdentifier $i) => $i->ban->severity === 'deep' || (! $siteWide && ! in_array($i->type, ['ip', 'network'], true)))
            ->map->ban
            ->sortByDesc('id')
            ->first();
    }

    public function activeFor(User $user): ?Ban
    {
        return Ban::active()->where('user_id', $user->id)->latest('id')->first();
    }

    /** What a ban of this severity would block for this customer (shown in the admin before confirming). */
    public function preview(User $user, string $severity): array
    {
        $activity = UserActivity::where('user_id', $user->id);
        $base = array_filter([
            'email' => [self::canonicalEmail($user->email)],
            'phone' => array_filter([self::canonicalPhone($user->phone)]),
            'device' => (clone $activity)->whereNotNull('device')->distinct()->pluck('device')->all(),
            'fingerprint' => (clone $activity)->whereNotNull('fingerprint')->distinct()->pluck('fingerprint')->all(),
        ]);
        if ($severity === 'deep') {
            $ips = (clone $activity)->whereNotNull('ip')->distinct()->pluck('ip')->push($user->getAttributes()['last_login_ip'] ?? null)->filter()->unique()->values()->all();
            $base['ip'] = $ips;
            $base['network'] = collect($ips)->map(fn ($ip) => self::network($ip))->filter()->unique()->values()->all();
        }

        return array_filter($base);
    }

    public function ban(User $user, string $severity, string $reason, ?string $duration, ?Carbon $until, ?User $by): Ban
    {
        $expires = $severity === 'temporary' ? ($until ?? $this->expiry($duration)) : null;

        return DB::transaction(function () use ($user, $severity, $reason, $expires, $by) {
            // A new decision replaces any earlier active one.
            Ban::active()->where('user_id', $user->id)->update(['lifted_at' => now(), 'lifted_by' => $by?->id]);

            $ban = Ban::create([
                'user_id' => $user->id,
                'severity' => $severity,
                'reason' => $reason,
                'expires_at' => $expires,
                'created_by' => $by?->id,
            ]);
            foreach ($this->preview($user, $severity) as $type => $values) {
                foreach (array_unique($values) as $value) {
                    $ban->identifiers()->create(['type' => $type, 'value' => mb_substr((string) $value, 0, 191)]);
                }
            }

            $user->forceFill([
                'banned_at' => now(),
                'banned_until' => $expires,
                'ban_reason' => $reason,
                'remember_token' => null,
            ])->save();

            if (config('session.driver') === 'database') {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
            }

            return $ban;
        });
    }

    public function lift(User $user, ?User $by): void
    {
        DB::transaction(function () use ($user, $by) {
            Ban::active()->where('user_id', $user->id)->update(['lifted_at' => now(), 'lifted_by' => $by?->id]);
            $user->forceFill(['banned_at' => null, 'banned_until' => null, 'ban_reason' => null])->save();
        });
    }

    private function expiry(?string $duration): Carbon
    {
        return match ($duration) {
            '1d' => now()->addDay(),
            '3d' => now()->addDays(3),
            '1w' => now()->addWeek(),
            '3m' => now()->addMonths(3),
            '6m' => now()->addMonths(6),
            default => now()->addMonth(),
        };
    }
}
