<?php

namespace Database\Seeders;

use App\Enums\StaffRole;
use App\Models\User;
use App\Services\Catalog\CatalogImporter;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $count = (new CatalogImporter)->import();
        $this->command?->info("Catalog: {$count} products imported.");

        User::firstOrCreate(['email' => 'demo@zovita.pk'], [
            'name' => 'Demo Customer',
            'password' => 'password',
            'phone' => '+92 300 0000000',
            'city' => 'Karachi',
            'address' => 'Block 5, Clifton',
        ]);

        // Staff accounts for the admin panel (sign in at /admin/login; each sets up two-step sign-in
        // with an authenticator app the first time). Change these passwords before going live:
        // `php artisan user:admin <email> --role=owner|pharmacist|support` or `--revoke`.
        $staff = [
            ['admin@zovita.com', 'Zovita Admin', 'Admin@1234', 'admin', StaffRole::Owner],
            ['pharmacist@zovita.com', 'Zovita Pharmacist', 'Pharma@1234', 'pharmacist', StaffRole::Pharmacist],
            ['support@zovita.com', 'Zovita Support', 'Support@1234', 'support', StaffRole::Support],
        ];
        foreach ($staff as [$email, $name, $password, $username, $role]) {
            $user = User::firstOrNew(['email' => $email]);
            if (! $user->exists) {
                $user->fill(['name' => $name, 'password' => $password])->save();
            }
            $user->forceFill(['username' => $username])->save();
            $user->setStaffRole($role);
        }
    }
}
