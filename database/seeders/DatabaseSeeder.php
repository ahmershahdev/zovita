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
    }
}
