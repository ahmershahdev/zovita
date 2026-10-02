<?php

namespace Database\Seeders;

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

        // Staff account for the admin panel (sign in at /admin/login). Change this password after the
        // first sign-in in production: `php artisan user:admin admin@zovita.com` grants/revokes access.
        $admin = User::firstOrNew(['email' => 'admin@zovita.com']);
        if (! $admin->exists) {
            $admin->fill(['name' => 'Zovita Admin', 'password' => 'Admin@1234'])->save();
        }
        $admin->forceFill(['is_admin' => true, 'username' => 'admin'])->save();
    }
}
