<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Services\Catalog\CatalogImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** "None" in the catalog source means "no listed ingredient", never an ingredient called None. */
class CatalogGenericsTest extends TestCase
{
    use RefreshDatabase;

    public function test_placeholder_ingredients_are_stored_as_unknown(): void
    {
        foreach (['None', ' none ', 'N/A', 'nil', '-', ''] as $placeholder) {
            $this->assertNull(CatalogImporter::generics($placeholder), $placeholder);
        }
        $this->assertNull(CatalogImporter::generics(null));
        $this->assertSame('Paracetamol', CatalogImporter::generics(' Paracetamol '));
    }

    public function test_products_without_an_ingredient_are_not_each_others_same_salt(): void
    {
        $a = Product::factory()->create(['generics' => null]);
        $b = Product::factory()->create(['generics' => null]);
        $this->assertFalse($a->sharesGenericWith($b));
    }
}
