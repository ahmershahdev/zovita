<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Department;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = Str::title($this->faker->unique()->words(2, true)).' Tablets 500mg';
        $department = Department::firstOrCreate(['slug' => 'medicines'], ['name' => 'Medicines']);

        return [
            'department_id' => $department->id,
            'category_id' => Category::firstOrCreate(['slug' => 'pain-fever-relief'], ['name' => 'Pain & Fever Relief', 'department_id' => $department->id])->id,
            'brand_id' => Brand::firstOrCreate(['slug' => 'haleon'], ['name' => 'Haleon'])->id,
            'name' => $name,
            'slug' => Str::slug($name),
            'form' => 'tablet',
            'pack' => 'strip',
            'price' => 500,
            'sale_price' => null,
            'stock' => 50,
            'max_per_order' => 10,
            'requires_prescription' => false,
            'is_featured' => false,
            'image_url' => 'https://example.test/image.jpg',
            'image_path' => 'products/'.Str::slug($name).'.webp',
        ];
    }

    public function onSale(float $salePrice): static
    {
        return $this->state(['sale_price' => $salePrice]);
    }

    public function prescription(): static
    {
        return $this->state(['requires_prescription' => true]);
    }

    /** No local photo, so the product is kept out of listings. */
    public function withoutImage(): static
    {
        return $this->state(['image_path' => null]);
    }

    public function stock(int $stock): static
    {
        return $this->state(['stock' => $stock]);
    }
}
