<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Pages\PageController;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Department;
use App\Models\Product;
use App\Services\Payments\PaymentService;
use App\Support\CatalogCache;
use App\Support\Content;
use App\Support\Seo;
use App\Support\ShopPath;
use Illuminate\Http\Response;

/**
 * Machine-readable entry points, all on the public site URL (config zovita.site_url):
 *   /sitemap.xml    pages, departments, categories and every listed product (with image + hreflang)
 *   /robots.txt     crawl rules for search engines and AI agents
 *   /llms.txt       concise, link-rich summary for language models (llmstxt.org format)
 *   /llms-full.txt  the full reference: catalogue structure, policies and every FAQ answer
 */
class SitemapController extends Controller
{
    public function sitemap(): Response
    {
        $xml = CatalogCache::remember('sitemap', now()->addHours(6), function () {
            $urls = [];
            $add = function (string $loc, ?string $lastmod = null, string $freq = 'weekly', float $priority = 0.5, ?string $image = null, ?string $title = null) use (&$urls) {
                $loc = Seo::absolute($loc);
                $urls[] = ['loc' => $loc, 'lastmod' => $lastmod, 'freq' => $freq, 'priority' => $priority, 'image' => $image ? Seo::absolute($image) : null, 'title' => $title, 'ur' => $loc.(str_contains($loc, '?') ? '&' : '?').'lang=ur'];
            };
            $today = now()->toDateString();

            $add(route('home'), $today, 'daily', 1.0);
            $add(route('shop.index'), $today, 'daily', 0.9);
            $add(route('body-map'), null, 'monthly', 0.8);
            foreach (['about', 'faq', 'contact', 'prescriptions.create', 'orders.track'] as $name) {
                $add(route($name), null, 'monthly', 0.5);
            }
            foreach (PageController::LEGAL as $page) {
                $add(route('legal', $page), Content::legal()['pages'][$page]['updated'] ?? null, 'yearly', 0.3);
            }
            foreach (Department::orderBy('sort_order')->get() as $department) {
                $add(ShopPath::url($department->slug), $today, 'daily', 0.8);
            }
            foreach (Category::with('department:id,slug')->whereHas('products', fn ($q) => $q->listed())->get() as $category) {
                $add(ShopPath::url($category->department?->slug, ['category' => $category->slug]), null, 'weekly', 0.6);
            }
            Product::listed()->select('id', 'name', 'slug', 'image_path', 'updated_at')->orderBy('id')->each(function (Product $p) use ($add) {
                $add(route('products.show', $p), $p->updated_at?->toAtomString(), 'weekly', 0.7, $p->image, $p->name);
            });

            return view('sitemap', ['urls' => $urls])->render();
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    public function robots(): Response
    {
        $site = Seo::siteUrl();
        $private = ['/account', '/bag', '/checkout', '/track-order/', '/wishlist', '/forgot-password', '/reset-password', '/search/', '/assistant/', '/signals/', '/locale'];
        $lines = ['# Zovita — '.$site, '', 'User-agent: *', 'Allow: /'];
        foreach ($private as $path) {
            $lines[] = 'Disallow: '.$path;
        }
        // AI crawlers and agents: welcome on public pages; llms.txt is their summary.
        foreach (['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'] as $agent) {
            $lines[] = '';
            $lines[] = 'User-agent: '.$agent;
            $lines[] = 'Allow: /';
            foreach ($private as $path) {
                $lines[] = 'Disallow: '.$path;
            }
        }
        array_push($lines, '', 'Sitemap: '.$site.'/sitemap.xml', '# LLM summary: '.$site.'/llms.txt', '# LLM full reference: '.$site.'/llms-full.txt');

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8', 'Cache-Control' => 'public, max-age=86400']);
    }

    public function llms(): Response
    {
        $text = CatalogCache::remember('llms', now()->addHours(6), function () {
            $site = Seo::siteUrl();
            $u = fn (string $url) => Seo::absolute($url);
            $listed = Product::listed()->count();
            $brands = Brand::whereHas('products', fn ($q) => $q->listed())->count();
            $out = [
                '# Zovita',
                '',
                "> Zovita is an online pharmacy ({$site}). It sells {$listed}+ authentic medicines, vitamins, skin and hair care, mother & baby products, personal care and health devices from {$brands} brands. Orders are pharmacist-verified, paid by card or cash on delivery, and delivered nationwide. Prescription-only medicines require an uploaded prescription, reviewed by a pharmacist and approved automatically if undecided after 24 hours. The site is available in English and Urdu (?lang=ur).",
                '',
                'Key facts:',
                app(PaymentService::class)->enabled()
                    ? '- Payment: debit/credit card on the payment provider\'s secure page (card numbers never stored by Zovita) or cash on delivery. Card orders are held for '.(int) config('payments.expires_minutes').' minutes while paying; card refunds go back to the same card.'
                    : '- Payment: cash on delivery (no card details asked for or stored).',
                '- Medicine safety: the bag checks active ingredients for well-known interactions (e.g. two paracetamol products, blood thinner + NSAID, sildenafil + nitrate) and shows what to do; serious ones must be acknowledged and are shown to the pharmacist. Not medical advice.',
                '- Refill reminders: customers who buy the same medicine regularly get an e-mail a few days before it is likely to run out, with a one-tap reorder link (can be switched off).',
                '- Accounts: optional two-step sign-in with an authenticator app for customers; staff can turn it on from the admin panel.',
                '- Delivery: free over PKR '.number_format((int) config('zovita.free_delivery_over')).', otherwise PKR '.number_format((int) config('zovita.delivery_fee')).'; major cities 1–3 business days, elsewhere 2–5.',
                '- Returns: unopened, room-temperature items within 7 days; damaged/wrong items reported within 48 hours are replaced or refunded in full.',
                '- Personal offers: automatic discounts based on browsing and purchase history, applied in the bag (no codes).',
                '- Support: '.config('zovita.support_phone').' · '.config('zovita.support_email').' · '.config('zovita.support_hours').'.',
                '',
                '## Shop',
                '- [All products]('.$u(route('shop.index')).'): searchable catalogue with filters for category, brand, form, prescription/OTC, stock and price.',
            ];
            foreach (Department::orderBy('sort_order')->get() as $d) {
                $out[] = "- [{$d->name}](".$u(ShopPath::url($d->slug))."): {$d->blurb}";
            }
            array_push($out,
                '- Search URLs: '.$site.'/shop/search-{term} (e.g. '.$site.'/shop/search-paracetamol).',
                '',
                '## Tools',
                '- ['.'Body map]('.$u(route('body-map')).'): interactive 3D symptom navigator with self-care tips, red flags and pharmacist-picked products. Not a diagnosis; emergencies → call 1122.',
                '- [Upload a prescription]('.$u(route('prescriptions.create')).'): photo or PDF, reviewed by a pharmacist.',
                '- [Track an order]('.$u(route('orders.track')).'): order number + email.',
                '',
                '## Help & policies',
                '- [FAQ]('.$u(route('faq')).'): ordering, delivery, payment, prescriptions, returns, account, privacy.',
            );
            foreach (Content::legal()['pages'] as $slug => $page) {
                $out[] = "- [{$page['title']}](".$u(route('legal', $slug))."): {$page['intro']}";
            }
            array_push($out, '- [Contact]('.$u(route('contact')).')', '- [About]('.$u(route('about')).')', '', '## Optional', '- [Full reference for LLMs]('.$site.'/llms-full.txt): every policy and FAQ answer in plain text.', '- [Sitemap]('.$site.'/sitemap.xml)');

            return implode("\n", $out)."\n";
        });

        return response($text, 200, ['Content-Type' => 'text/plain; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    public function llmsFull(): Response
    {
        $text = CatalogCache::remember('llms-full', now()->addHours(6), function () {
            $fill = Content::filler();
            $u = fn (string $url) => Seo::absolute($url);
            $out = [rtrim($this->llms()->getContent()), '', '---', '', '# Catalogue structure', ''];

            foreach (Department::with(['categories' => fn ($q) => $q->withCount(['products' => fn ($p) => $p->listed()])->orderBy('name')])->orderBy('sort_order')->get() as $d) {
                $out[] = "## {$d->name}";
                $out[] = $d->blurb;
                foreach ($d->categories->where('products_count', '>', 0) as $c) {
                    $out[] = "- [{$c->name}](".$u(ShopPath::url($d->slug, ['category' => $c->slug])).") — {$c->products_count} products";
                }
                $out[] = '';
            }

            $out[] = '# Medicine interaction checks';
            $out[] = '';
            $out[] = 'The bag compares the active ingredients of the medicines in it (tablets, capsules, syrups, sachets and injections; creams, shampoos and drops are ignored) against these rules. Every warning says what to do and is shown to the pharmacist on the order. It is an automatic check, not medical advice.';
            $out[] = '';
            foreach (json_decode((string) file_get_contents(resource_path('content/interactions.json')), true)['rules'] as $rule) {
                $out[] = '- '.ucfirst($rule['severity']).': '.$rule['title'].'. '.$rule['detail'].' What to do: '.$rule['advice'];
            }
            $out[] = '';

            $out[] = '# Frequently asked questions';
            $out[] = '';
            foreach (Content::faq() as $group) {
                $out[] = "## {$group['title']}";
                foreach ($group['items'] as $item) {
                    $out[] = "### {$item['q']}";
                    $out[] = $fill($item['a']);
                    $out[] = '';
                }
            }

            $out[] = '# Policies';
            $out[] = '';
            foreach (Content::legal()['pages'] as $slug => $page) {
                $out[] = "## {$page['title']} (".$u(route('legal', $slug)).", updated {$page['updated']})";
                $out[] = $fill($page['intro']);
                $out[] = '';
                foreach ($page['sections'] as $section) {
                    $out[] = "### {$section['heading']}";
                    if (! empty($section['summary'])) {
                        $out[] = 'In short: '.$fill($section['summary']);
                    }
                    foreach ($section['blocks'] as $block) {
                        $out = [...$out, ...$this->blockText($block, $fill)];
                    }
                    $out[] = '';
                }
            }

            return implode("\n", $out)."\n";
        });

        return response($text, 200, ['Content-Type' => 'text/plain; charset=UTF-8', 'Cache-Control' => 'public, max-age=3600']);
    }

    /** Plain-text rendering of one policy content block. */
    private function blockText(array $block, callable $fill): array
    {
        return match (true) {
            isset($block['p']) => [$fill($block['p'])],
            isset($block['list']) => array_map(fn ($i) => '- '.$fill($i), $block['list']),
            isset($block['steps']) => array_map(fn ($s, $n) => ($n + 1).'. '.$fill($s['title']).' — '.$fill($s['text']), $block['steps'], array_keys($block['steps'])),
            isset($block['timeline']) => array_map(fn ($t) => '- '.$fill($t['when']).': '.$fill($t['title']).' — '.$fill($t['text']), $block['timeline']),
            isset($block['cards']) => array_map(fn ($c) => '- '.$fill($c['title']).': '.$fill($c['text']), $block['cards']),
            isset($block['callout']) => ['> '.$fill($block['callout']['title']).': '.$fill($block['callout']['text'])],
            isset($block['table']) => [
                '| '.implode(' | ', $block['table']['head']).' |',
                '|'.str_repeat(' --- |', count($block['table']['head'])),
                ...array_map(fn ($r) => '| '.implode(' | ', array_map($fill, $r)).' |', $block['table']['rows']),
            ],
            default => [],
        };
    }
}
