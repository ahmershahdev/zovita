<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'user:admin {email} {--revoke : Remove admin rights instead}';

    protected $description = 'Grant (or revoke) admin-panel access for an existing account';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->components->error('No account with that email.');

            return self::FAILURE;
        }
        $user->forceFill(['is_admin' => ! $this->option('revoke')])->save();
        $this->components->info($user->email.($this->option('revoke') ? ' is no longer an admin.' : ' is now an admin.'));

        return self::SUCCESS;
    }
}
