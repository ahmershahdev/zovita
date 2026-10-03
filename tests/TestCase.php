<?php

namespace Tests;

use App\Enums\StaffRole;
use App\Models\User;
use App\Services\Security\PendingLogin;
use App\Services\Security\TwoFactor;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** A staff member with a role and two-step sign-in already set up (as every real one has). */
    protected function makeStaff(StaffRole $role = StaffRole::Owner, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->setStaffRole($role);
        app(TwoFactor::class)->enable($user, app(TwoFactor::class)->generateSecret(), 1);

        return $user->fresh();
    }

    /** Signed in on this session AND past the second step, which EnsureAdmin requires. */
    protected function actingAsStaff(User $user): static
    {
        return $this->actingAs($user)->withSession([PendingLogin::VERIFIED => $user->id]);
    }

    /** The code an authenticator app would show right now. */
    protected function totp(User $user): string
    {
        return app(TwoFactor::class)->code($user->fresh()->two_factor_secret);
    }
}
