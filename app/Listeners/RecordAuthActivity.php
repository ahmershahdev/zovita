<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\Security\ActivityLog;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Registered;

/** Sign-ins, sign-outs, failed attempts and sign-ups in the customer's activity timeline. */
class RecordAuthActivity
{
    public function handle(Login|Logout|Failed|Registered $event): void
    {
        $user = $event->user instanceof User ? $event->user : null;

        match (true) {
            $event instanceof Registered => ActivityLog::record('account.created', 'Created an account', $user),
            $event instanceof Login => $this->login($user),
            $event instanceof Logout => ActivityLog::record('auth.logout', 'Signed out', $user),
            $event instanceof Failed => ActivityLog::record('auth.failed', 'Failed sign-in attempt (wrong password)', $user, ['email' => $event->credentials['email'] ?? null]),
        };
    }

    private function login(?User $user): void
    {
        if (! $user) {
            return;
        }
        ActivityLog::record('auth.login', 'Signed in', $user);
        $user->forceFill(['last_login_ip' => request()->ip(), 'last_login_at' => now()])->saveQuietly();
    }
}
