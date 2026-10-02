<?php

namespace App\Services\Personalization;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Stable identity for personalisation: `u:{id}` when signed in, otherwise `g:{uuid}` from a
 * long-lived, encrypted first-party cookie (set by App\Http\Middleware\TrackVisitor).
 */
class Visitor
{
    public const COOKIE = 'zv_vid';

    /** Always the current request: services holding a Visitor may outlive a single request. */
    private function request(): Request
    {
        return request();
    }

    public function key(): string
    {
        $user = Auth::user();

        return $user instanceof User ? 'u:'.$user->id : 'g:'.$this->guestId();
    }

    public function guestKey(): ?string
    {
        $id = $this->request()->cookie(self::COOKIE);

        return is_string($id) && Str::isUuid($id) ? 'g:'.$id : null;
    }

    public function userId(): ?int
    {
        return Auth::id();
    }

    public function guestId(): string
    {
        $id = $this->request()->cookie(self::COOKIE) ?? $this->request()->attributes->get(self::COOKIE);
        if (! is_string($id) || ! Str::isUuid($id)) {
            $id = (string) Str::uuid();
            $this->request()->attributes->set(self::COOKIE, $id);
            Cookie::queue(Cookie::make(self::COOKIE, $id, 60 * 24 * 365, httpOnly: true, sameSite: 'lax'));
        }

        return $id;
    }
}
