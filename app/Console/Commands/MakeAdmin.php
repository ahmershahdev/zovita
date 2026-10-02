<?php

namespace App\Console\Commands;

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'user:admin {email}
        {--role=owner : owner, pharmacist or support}
        {--revoke : Remove admin access instead}
        {--reset-2fa : Make them set up two-step sign-in again (lost phone)}';

    protected $description = 'Grant, change or revoke admin-panel access for an existing account';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->components->error('No account with that email.');

            return self::FAILURE;
        }

        if ($this->option('reset-2fa')) {
            $user->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null])->save();
            $this->components->info("{$user->email} will set up two-step sign-in again at their next staff sign-in.");

            return self::SUCCESS;
        }

        if ($this->option('revoke')) {
            $user->setStaffRole(null);
            $this->components->info($user->email.' is no longer staff.');

            return self::SUCCESS;
        }

        $role = StaffRole::tryFrom((string) $this->option('role'));
        if (! $role) {
            $this->components->error('Role must be one of: '.implode(', ', array_column(StaffRole::cases(), 'value')).'.');

            return self::FAILURE;
        }
        $user->setStaffRole($role);
        $this->components->info("{$user->email} is now {$role->label()}. Two-step sign-in is set up at their first staff sign-in.");

        return self::SUCCESS;
    }
}
