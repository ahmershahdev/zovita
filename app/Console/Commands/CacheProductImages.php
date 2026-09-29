<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Downloads remote product images into storage/app/public/products so the storefront
 * does not hotlink the source CDN. Run `php artisan storage:link` once beforehand.
 */
class CacheProductImages extends Command
{
    protected $signature = 'catalog:cache-images {--force : Re-download images that are already cached}';

    protected $description = 'Download product images to local public storage';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $query = Product::query()->whereNotNull('image_url');
        if (! $this->option('force')) {
            $query->whereNull('image_path');
        }

        $failed = 0;
        $this->withProgressBar($query->lazyById(50), function (Product $product) use ($disk, &$failed) {
            try {
                $response = Http::timeout(20)->retry(2, 500)->get($product->image_url)->throw();
                $extension = match (strtok((string) $response->header('Content-Type'), ';')) {
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    default => 'jpg',
                };
                $path = "products/{$product->slug}.{$extension}";
                $disk->put($path, $response->body());
                $product->forceFill(['image_path' => $path])->saveQuietly();
            } catch (Throwable) {
                $failed++;
            }
        });

        $this->newLine();
        $failed
            ? $this->components->warn("{$failed} images could not be downloaded; those products keep their remote URL.")
            : $this->components->info('All product images cached locally.');

        return self::SUCCESS;
    }
}
