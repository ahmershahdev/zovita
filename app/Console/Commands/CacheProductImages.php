<?php

namespace App\Console\Commands;

use App\Models\Product;
use GdImage;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Stores every product image locally as WebP in two sizes so the storefront never hotlinks the
 * source CDN and cards can use a responsive srcset:
 *
 *   storage/app/public/products/{slug}.webp      640px (product page, large cards)
 *   storage/app/public/products/{slug}-sm.webp   320px (grids, rails, search, cart)
 *
 * Previously cached JPEG/PNG files are converted in place instead of being downloaded again.
 * Run `php artisan storage:link` once beforehand.
 */
class CacheProductImages extends Command
{
    protected $signature = 'catalog:cache-images
        {--force : Rebuild images that are already cached as WebP}
        {--quality=80 : WebP quality (0-100)}
        {--concurrency=8 : Parallel downloads (the source CDN is slow per connection)}';

    protected $description = 'Download product images and store them locally as responsive WebP';

    /** Output widths keyed by filename suffix. */
    public const SIZES = ['' => 640, '-sm' => 320];

    public function handle(): int
    {
        if (! function_exists('imagewebp')) {
            $this->components->error('The GD extension with WebP support is required.');

            return self::FAILURE;
        }

        $disk = Storage::disk('public');
        $quality = max(0, min(100, (int) $this->option('quality')));
        $query = Product::query()->whereNotNull('image_url');
        if (! $this->option('force')) {
            $query->where(fn ($q) => $q->whereNull('image_path')->orWhere('image_path', 'not like', '%.webp'));
        }

        $failed = 0;
        $concurrency = max(1, (int) $this->option('concurrency'));
        $bar = $this->output->createProgressBar((clone $query)->count());
        $bar->start();

        $query->chunkById($concurrency, function ($products) use ($disk, $quality, $bar, &$failed) {
            $sources = $this->fetchSources($products, $disk);
            foreach ($products as $product) {
                try {
                    $this->store($product, $sources[$product->id] ?? throw new RuntimeException('Download failed'), $disk, $quality);
                } catch (Throwable) {
                    $failed++;
                }
                $bar->advance();
            }
        });
        $bar->finish();

        $this->newLine();
        $failed
            ? $this->components->warn("{$failed} images could not be processed; those products keep their remote URL.")
            : $this->components->info('All product images cached locally as WebP.');

        return self::SUCCESS;
    }

    /**
     * Image bytes per product id: previously cached originals are read from disk, the rest are
     * downloaded concurrently. Failed or non-image responses are simply left out.
     *
     * @return array<int, string>
     */
    private function fetchSources($products, $disk): array
    {
        $sources = [];
        $remote = [];
        foreach ($products as $product) {
            if ($product->image_path && $disk->exists($product->image_path)) {
                $sources[$product->id] = $disk->get($product->image_path);
            } else {
                $remote[$product->id] = $product->image_url;
            }
        }

        if ($remote) {
            $responses = Http::pool(fn (Pool $pool) => collect($remote)->map(
                fn ($url, $id) => $pool->as((string) $id)->timeout(180)->connectTimeout(15)->get($url),
            )->all());

            foreach ($responses as $id => $response) {
                if ($response instanceof Response && $response->successful() && str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                    $sources[(int) $id] = $response->body();
                }
            }
        }

        return $sources;
    }

    private function store(Product $product, string $source, $disk, int $quality): void
    {
        $image = @imagecreatefromstring($source);
        if (! $image instanceof GdImage) {
            throw new RuntimeException('Unreadable image');
        }

        foreach (self::SIZES as $suffix => $width) {
            $disk->put("products/{$product->slug}{$suffix}.webp", $this->encode($image, $width, $quality));
        }
        imagedestroy($image);

        $old = $product->image_path;
        $product->forceFill(['image_path' => "products/{$product->slug}.webp"])->saveQuietly();
        if ($old && ! str_ends_with($old, '.webp')) {
            $disk->delete($old);
        }
    }

    /** Fit the image inside a square of $size on a white background (product shots are on white). */
    private function encode(GdImage $image, int $size, int $quality): string
    {
        $w = imagesx($image);
        $h = imagesy($image);
        $scale = min($size / $w, $size / $h, 1);
        $tw = (int) round($w * $scale);
        $th = (int) round($h * $scale);
        $canvasSize = (int) min($size, max($tw, $th));

        $canvas = imagecreatetruecolor($canvasSize, $canvasSize);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $image, intdiv($canvasSize - $tw, 2), intdiv($canvasSize - $th, 2), 0, 0, $tw, $th, $w, $h);

        ob_start();
        imagewebp($canvas, null, $quality);
        imagedestroy($canvas);

        return (string) ob_get_clean();
    }
}
