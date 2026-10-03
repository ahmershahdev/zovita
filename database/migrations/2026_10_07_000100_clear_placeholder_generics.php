<?php

use App\Services\Catalog\CatalogImporter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The catalog source writes "None" when a product has no listed active ingredient. Stored as-is it
 * showed up as an ingredient chip and made every such product a "same salt" alternative of the
 * others; it means "unknown", so store null.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->whereIn(DB::raw('LOWER(TRIM(generics))'), CatalogImporter::NO_GENERICS)
            ->update(['generics' => null]);
    }

    public function down(): void
    {
        // Nothing to restore: the placeholder carried no information.
    }
};
