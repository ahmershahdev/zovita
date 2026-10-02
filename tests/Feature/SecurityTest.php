<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Http\Kernel;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_html_responses_carry_a_nonce_based_csp(): void
    {
        $response = $this->get(route('home'));
        $csp = $response->headers->get('Content-Security-Policy');

        $this->assertMatchesRegularExpression("/script-src 'self' 'nonce-[A-Za-z0-9]+'/", $csp);
        $this->assertStringNotContainsString("'unsafe-eval'", $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
        $this->assertStringContainsString("frame-ancestors 'self'", $csp);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }

    public function test_sql_injection_payloads_are_inert(): void
    {
        Product::factory()->create(['name' => 'Panadol Tablets', 'slug' => 'panadol-tablets']);
        $payloads = ["' OR 1=1 --", '" OR ""="', '1; DROP TABLE products; --', "%' UNION SELECT password FROM users --", "\\' OR \\'1\\'=\\'1"];

        foreach ($payloads as $payload) {
            $this->getJson(route('search.suggest', ['q' => $payload]))->assertOk()->assertJsonCount(0, 'products');
            $this->followingRedirects()->get(route('shop.index', ['q' => $payload, 'brand' => $payload, 'sort' => $payload, 'min' => $payload]))->assertSuccessful();
        }

        $admin = $this->makeStaff();
        foreach ($payloads as $payload) {
            $this->actingAsStaff($admin)->get(route('admin.orders.index', ['q' => $payload, 'status' => $payload]))->assertOk();
            $this->get(route('admin.users.index', ['q' => $payload]))->assertOk();
        }

        $this->assertDatabaseHas('products', ['slug' => 'panadol-tablets']);
    }

    public function test_reflected_input_is_escaped(): void
    {
        $xss = '<script>alert(1)</script>';
        $response = $this->followingRedirects()->get(route('shop.index', ['q' => $xss]));

        $response->assertSuccessful();
        $this->assertStringNotContainsString($xss, $response->getContent());
    }

    public function test_abusive_requests_are_rejected_before_doing_work(): void
    {
        $this->get('/shop?'.str_repeat('a', 2100))->assertStatus(414);
        $this->get('/shop?'.http_build_query(array_fill_keys(range(1, 50), 'x')))->assertStatus(400);
        $this->call('TRACE', '/')->assertStatus(405);
        $this->post(route('contact.store'), ['name' => "evil\0name"])->assertStatus(400);
    }

    public function test_writes_are_rate_limited_per_client(): void
    {
        RateLimiter::clear('ip:127.0.0.1');
        $product = Product::factory()->create();
        $statuses = collect(range(1, 70))->map(fn () => $this->post(route('wishlist.toggle', $product))->status());

        $this->assertContains(429, $statuses->all());
    }

    public function test_csrf_protection_is_active_for_state_changes(): void
    {
        // Laravel skips CSRF in unit tests by default; prove the middleware is wired for real requests.
        $this->assertContains(
            ValidateCsrfToken::class,
            app(Kernel::class)->getMiddlewareGroups()['web'],
        );
    }
}
