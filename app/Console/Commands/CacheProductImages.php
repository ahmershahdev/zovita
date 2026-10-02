<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Support\CatalogCache;
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
 * When the catalog URL is dead (the CDN often renames .jpg ↔ .webp), sibling URLs are tried before
 * giving up. The source's logo placeholder is recognised by a perceptual hash and rejected, so a
 * product either has a real photo or none (and is then kept out of listings, see Product::listed).
 * Run `php artisan storage:link` once beforehand.
 */
class CacheProductImages extends Command
{
    protected $signature = 'catalog:cache-images
        {--force : Rebuild images that are already cached as WebP}
        {--quality=80 : WebP quality (0-100)}
        {--concurrency=6 : Parallel downloads (the source CDN is slow per connection)}';

    protected $description = 'Download product images and store them locally as responsive WebP';

    /** Output widths keyed by filename suffix. */
    public const SIZES = ['' => 640, '-sm' => 320];

    private const CDN = 'https://dvago-assets.s3.ap-southeast-1.amazonaws.com';

    /** Average hash of the source's "no photo" logo placeholder. */
    private const PLACEHOLDER_HASH = 'ffff7f0000ffffff';

    public function handle(): int
    {
        if (! function_exists('imagewebp')) {
            $this->components->error('The GD extension with WebP support is required.');

            return self::FAILURE;
        }

        // A few source originals are 35 MB / 6000px; decoding them needs room.
        ini_set('memory_limit', '1536M');

        $disk = Storage::disk('public');
        $quality = max(0, min(100, (int) $this->option('quality')));
        $this->auditCached($disk);
        $query = Product::query();
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
                    $this->forget($product, $disk);
                    $failed++;
                }
                $bar->advance();
            }
        });
        $bar->finish();
        CatalogCache::flush();

        $this->newLine();
        $failed
            ? $this->components->warn("{$failed} products have no usable photo and are hidden from listings.")
            : $this->components->info('All product images cached locally as WebP.');
        $this->components->info(Product::listed()->count().' products have a local WebP photo.');

        return self::SUCCESS;
    }

    /**
     * Image bytes per product id: previously cached originals are read from disk, the rest are
     * downloaded concurrently, walking through candidate URLs until one returns an image.
     *
     * @return array<int, string>
     */
    private function fetchSources($products, $disk): array
    {
        $sources = [];
        $candidates = [];
        foreach ($products as $product) {
            if ($product->image_path && ! str_ends_with($product->image_path, '.webp') && $disk->exists($product->image_path)) {
                $sources[$product->id] = $disk->get($product->image_path);
            } else {
                $candidates[$product->id] = $this->candidateUrls($product);
            }
        }

        while ($candidates = array_filter($candidates)) {
            $batch = array_map(fn (array $urls) => $urls[0], $candidates);
            $candidates = array_map(fn (array $urls) => array_slice($urls, 1), $candidates);

            $responses = Http::pool(fn (Pool $pool) => collect($batch)->map(
                fn ($url, $id) => $pool->as((string) $id)->timeout(240)->connectTimeout(15)->get($url),
            )->all());

            foreach ($responses as $id => $response) {
                if ($response instanceof Response && $response->successful() && str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                    $sources[(int) $id] = $response->body();
                    unset($candidates[(int) $id]);
                }
            }
        }

        return $sources;
    }

    /** The catalog URL, its other-extension siblings, then the CDN's slug-based location. */
    private function candidateUrls(Product $product): array
    {
        $urls = [];
        if ($product->image_url) {
            $urls[] = $product->image_url;
            $base = preg_replace('/\.(jpe?g|png|webp)$/i', '', $product->image_url);
            foreach (['.webp', '.jpg', '.JPG', '.png', '.jpeg'] as $ext) {
                $urls[] = $base.$ext;
            }
        }
        foreach (['webp', 'jpg', 'png'] as $ext) {
            $urls[] = self::CDN."/dvago-products-images/{$product->slug}.{$ext}";
        }

        return array_values(array_unique($urls));
    }

    private function store(Product $product, string $source, $disk, int $quality): void
    {
        $image = @imagecreatefromstring($source);
        if (! $image instanceof GdImage) {
            throw new RuntimeException('Unreadable image');
        }
        if (self::isPlaceholder($image)) {
            imagedestroy($image);
            throw new RuntimeException('Placeholder image');
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

    /** Un-cache WebP files that are missing, unreadable or the logo placeholder, so they get re-fetched. */
    private function auditCached($disk): void
    {
        $cleared = 0;
        Product::query()->where('image_path', 'like', '%.webp')->select('id', 'slug', 'image_path')
            ->each(function (Product $product) use ($disk, &$cleared) {
                $small = substr($product->image_path, 0, -5).'-sm.webp';
                $image = $disk->exists($product->image_path) && $disk->exists($small)
                    ? @imagecreatefromstring($disk->get($small))
                    : false;
                if (! $image instanceof GdImage || self::isPlaceholder($image)) {
                    $this->forget($product, $disk);
                    $cleared++;
                }
                if ($image instanceof GdImage) {
                    imagedestroy($image);
                }
            });

        if ($cleared) {
            $this->components->info("{$cleared} cached images were missing or placeholders and will be re-fetched.");
        }
    }

    /** Drop a product's files so it is treated as photo-less rather than showing a stale or bad image. */
    private function forget(Product $product, $disk): void
    {
        foreach (array_keys(self::SIZES) as $suffix) {
            $disk->delete("products/{$product->slug}{$suffix}.webp");
        }
        if ($product->image_path) {
            $product->forceFill(['image_path' => null])->saveQuietly();
        }
    }

    /**
     * The placeholder is the lime-green DVAGO wordmark on white. Shape alone (average hash) also
     * matches horizontal cream tubes, and colour alone matches green packs, so both must agree.
     */
    public static function isPlaceholder(GdImage $image): bool
    {
        if (self::hamming(self::averageHash($image), self::PLACEHOLDER_HASH) > 6) {
            return false;
        }

        $small = imagecreatetruecolor(32, 32);
        imagecopyresampled($small, $image, 0, 0, 0, 0, 32, 32, imagesx($image), imagesy($image));
        $green = $white = 0;
        for ($y = 0; $y < 32; $y++) {
            for ($x = 0; $x < 32; $x++) {
                $rgb = imagecolorat($small, $x, $y);
                [$r, $g, $b] = [($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF];
                if ($r >= 235 && $g >= 235 && $b >= 235) {
                    $white++;
                } elseif ($g - $r >= 25 && $g - $b >= 60 && $g >= 120) {
                    $green++;
                }
            }
        }
        imagedestroy($small);

        return $green / 1024 >= 0.06 && ($green + $white) / 1024 >= 0.88;
    }

    /** 64-bit average hash (8×8 greyscale, above/below mean) as 16 hex chars. */
    public static function averageHash(GdImage $image): string
    {
        $small = imagecreatetruecolor(8, 8);
        imagefill($small, 0, 0, imagecolorallocate($small, 255, 255, 255));
        imagecopyresampled($small, $image, 0, 0, 0, 0, 8, 8, imagesx($image), imagesy($image));
        $values = [];
        for ($y = 0; $y < 8; $y++) {
            for ($x = 0; $x < 8; $x++) {
                $rgb = imagecolorat($small, $x, $y);
                $values[] = ((($rgb >> 16) & 0xFF) * 299 + (($rgb >> 8) & 0xFF) * 587 + ($rgb & 0xFF) * 114) / 1000;
            }
        }
        imagedestroy($small);
        $mean = array_sum($values) / 64;
        $bits = implode('', array_map(fn ($v) => $v >= $mean ? '1' : '0', $values));

        return implode('', array_map(fn ($nibble) => dechex(bindec($nibble)), str_split($bits, 4)));
    }

    private static function hamming(string $a, string $b): int
    {
        if (strlen($a) !== strlen($b)) {
            return PHP_INT_MAX;
        }
        $distance = 0;
        for ($i = 0, $n = strlen($a); $i < $n; $i++) {
            $distance += substr_count(decbin(hexdec($a[$i]) ^ hexdec($b[$i])), '1');
        }

        return $distance;
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
