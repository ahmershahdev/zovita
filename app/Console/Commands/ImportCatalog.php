<?php

namespace App\Console\Commands;

use App\Services\Catalog\CatalogImporter;
use Illuminate\Console\Command;

class ImportCatalog extends Command
{
    protected $signature = 'catalog:import {--path= : Path to a catalog JSON file}';

    protected $description = 'Import (or refresh) products from database/data/catalog.json';

    public function handle(): int
    {
        $count = (new CatalogImporter((string) $this->option('path')))->import();
        $this->components->info("Imported {$count} products.");

        return self::SUCCESS;
    }
}
