<?php

namespace App\Services\Security;

use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Support\Str;

/**
 * Writes the per-customer activity timeline shown to admins: what happened, when, from which IP,
 * browser and device. Never throws — logging must not break the action being logged.
 */
class ActivityLog
{
    public static function record(string $type, string $description, ?User $user = null, array $meta = []): void
    {
        try {
            $request = request();
            $user ??= $request->user();
            $device = $request->cookie('zv_vid');
            // No session in the scheduler, queue workers or payment webhooks: still log the event.
            $fp = $request->hasSession() ? $request->session()->get('zv_fp') : null;

            UserActivity::create([
                'user_id' => $user?->id,
                'type' => $type,
                'description' => Str::limit($description, 250),
                'ip' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
                'device' => is_string($device) && Str::isUuid($device) ? $device : null,
                'fingerprint' => is_string($fp) ? $fp : null,
                'meta' => $meta ?: null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
