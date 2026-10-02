<?php

use App\Models\Brand;
use App\Support\CatalogCache;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Brand names are shown without the local-subsidiary suffix (see Brand::cleanName). */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            foreach (DB::table('brands')->orderBy('id')->get(['id', 'name', 'slug']) as $brand) {
                $name = Brand::cleanName($brand->name);
                if ($name === $brand->name) {
                    continue;
                }
                $slug = Str::slug($name);
                $existing = DB::table('brands')->where('slug', $slug)->where('id', '!=', $brand->id)->value('id');
                if ($existing) {
                    // The same company already exists under the clean name: fold this one into it.
                    DB::table('products')->where('brand_id', $brand->id)->update(['brand_id' => $existing]);
                    DB::table('brands')->where('id', $brand->id)->delete();
                } else {
                    DB::table('brands')->where('id', $brand->id)->update(['name' => $name, 'slug' => $slug, 'updated_at' => now()]);
                }
            }
        });

        CatalogCache::flush();
    }

    public function down(): void
    {
        // Irreversible data clean-up.
    }
};
