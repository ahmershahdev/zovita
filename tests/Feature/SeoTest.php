<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['zovita.site_url' => 'https://zovita.ahmershah.dev']);
    }

    /** @return array<string, array{string, string|null}> route => [path, structured-data type] */
    public static function publicPages(): array
    {
        return [
            'home' => ['/', 'WebSite'],
            'shop' => ['/shop', 'ItemList'],
            'body map' => ['/body-map', 'MedicalWebPage'],
            'faq' => ['/faq', 'FAQPage'],
            'about' => ['/about', 'AboutPage'],
            'contact' => ['/contact', 'ContactPage'],
            'returns' => ['/policies/returns', 'WebPage'],
            'privacy' => ['/policies/privacy', 'WebPage'],
            'prescription' => ['/prescription', 'WebPage'],
        ];
    }

    /** @dataProvider publicPages */
    public function test_public_pages_ship_complete_server_rendered_seo(string $path, string $schema): void
    {
        Product::factory()->create();
        $html = $this->get($path)->assertOk()->getContent();

        $this->assertMatchesRegularExpression('/<title inertia>[^<]{3,}— Zovita<\/title>|<title inertia>Zovita — [^<]+<\/title>/u', $html);
        $this->assertMatchesRegularExpression('/<meta inertia="description"[^>]+content="[^"]{50,}"/', $html);
        $this->assertStringContainsString('rel="canonical" href="https://zovita.ahmershah.dev', $html);
        $this->assertStringContainsString('hreflang="ur"', $html);
        $this->assertStringContainsString('property="og:image" content="https://zovita.ahmershah.dev', $html);
        $this->assertStringContainsString('"@type":"'.$schema.'"', $html);
        $this->assertStringContainsString('index,follow', $html);
        $this->assertStringNotContainsString('Pakistan', $html);
    }

    /** @dataProvider publicPages */
    public function test_meta_title_and_description_stay_within_search_engine_limits(string $path): void
    {
        Product::factory()->create();
        $html = $this->get($path)->assertOk()->getContent();

        preg_match('/<title inertia>([^<]+)<\/title>/u', $html, $t);
        preg_match('/<meta inertia="description"[^>]+content="([^"]*)"/', $html, $d);
        $title = html_entity_decode($t[1] ?? '', ENT_QUOTES);
        $description = html_entity_decode($d[1] ?? '', ENT_QUOTES);

        $this->assertLessThan(60, mb_strlen($title), "Title over 60 chars on {$path}: {$title}");
        $this->assertLessThan(150, mb_strlen($description), "Description over 150 chars on {$path}: {$description}");
    }

    public function test_product_meta_description_stays_within_limits(): void
    {
        $product = Product::factory()->create([
            'description' => str_repeat('This is a long clinical description of the medicine and its many uses. ', 20),
        ]);

        $html = $this->get('/product/'.$product->slug)->assertOk()->getContent();
        preg_match('/<meta inertia="description"[^>]+content="([^"]*)"/', $html, $d);

        $this->assertLessThan(150, mb_strlen(html_entity_decode($d[1] ?? '', ENT_QUOTES)));
    }

    public function test_brand_names_drop_the_local_subsidiary_suffix(): void
    {
        $this->assertSame('Searle', Brand::cleanName('Searle Pakistan (Pvt) Ltd.'));
        $this->assertSame('Otsuka', Brand::cleanName('Otsuka Pakistan Pvt Limited'));
        $this->assertSame('Pharmaceutical Products', Brand::cleanName('Pakistan Pharmaceutical Prod'));
        $this->assertSame('Abbott', Brand::cleanName('Abbott'));
    }

    public function test_private_pages_are_noindex(): void
    {
        foreach (['/bag', '/wishlist', '/checkout', '/forgot-password'] as $path) {
            $response = $this->get($path);
            if ($response->isRedirect()) {
                continue;
            }
            $this->assertStringContainsString('noindex', $response->getContent(), $path);
        }
    }

    public function test_product_pages_have_product_schema_on_the_public_domain(): void
    {
        $product = Product::factory()->create(['name' => 'Panadol Tablets 500mg', 'slug' => 'panadol-tablets-500mg']);
        $html = $this->get(route('products.show', $product))->getContent();

        $this->assertStringContainsString('"@type":"Product"', $html);
        $this->assertStringContainsString('"url":"https://zovita.ahmershah.dev/product/panadol-tablets-500mg"', $html);
        $this->assertStringContainsString('"@type":"BreadcrumbList"', $html);
    }

    public function test_sitemap_robots_and_llms_files(): void
    {
        $product = Product::factory()->create();

        $sitemap = $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8')->getContent();
        $this->assertStringContainsString('<loc>https://zovita.ahmershah.dev/product/'.$product->slug.'</loc>', $sitemap);
        $this->assertStringContainsString('hreflang="ur"', $sitemap);
        $this->assertNotFalse(simplexml_load_string($sitemap));

        $robots = $this->get('/robots.txt')->assertOk()->getContent();
        $this->assertStringContainsString('Sitemap: https://zovita.ahmershah.dev/sitemap.xml', $robots);
        $this->assertStringContainsString('Disallow: /account', $robots);
        $this->assertStringNotContainsString('/admin', $robots); // never advertise the staff area

        $llms = $this->get('/llms.txt')->assertOk()->getContent();
        $this->assertStringStartsWith('# Zovita', $llms);
        $this->assertStringContainsString('https://zovita.ahmershah.dev/llms-full.txt', $llms);

        $full = $this->get('/llms-full.txt')->assertOk()->getContent();
        $this->assertStringContainsString('# Frequently asked questions', $full);
        $this->assertStringContainsString('## Returns & refunds', $full);
        $this->assertStringNotContainsString('{email}', $full);
    }
}
