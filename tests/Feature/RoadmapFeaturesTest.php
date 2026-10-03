<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Mail\RefillReminderMail;
use App\Models\Ban;
use App\Models\Order;
use App\Models\Product;
use App\Models\RefillReminder;
use App\Models\User;
use App\Services\Catalog\InteractionChecker;
use App\Services\Experiments\Experiments;
use App\Services\Personalization\Refills;
use App\Services\Security\BanGuard;
use App\Services\Security\MalwareScanner;
use Illuminate\Cache\FileStore;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/** Refill reminders, drug-interaction warnings, sticky A/B variants, shared abuse stores, upload scanning. */
class RoadmapFeaturesTest extends TestCase
{
    use RefreshDatabase;

    // What tests/Support/fake-clamd.php reports as infected (real EICAR gets quarantined by desktop AV).
    private const MALWARE = 'ZOVITA-FAKE-MALWARE-MARKER';

    private function details(array $overrides = []): array
    {
        return array_merge(['name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '0300 1234567', 'address' => 'House 12, Street 4, Gulberg III', 'city' => 'Lahore'], $overrides);
    }

    /* ── drug interactions ─────────────────────────────────────────── */

    public function test_ingredients_are_parsed_and_matched_to_classes(): void
    {
        $this->assertSame(['hyoscine butylbromide', 'paracetamol'], InteractionChecker::ingredients('Hyoscine Butylbromide , Paracetamol'));
        $this->assertSame([], InteractionChecker::ingredients('None'));
        $checker = app(InteractionChecker::class);
        $this->assertContains('domperidone', $checker->classesFor('Domeperidone Maleate')); // the catalogue's own spelling
        $this->assertContains('nsaid', $checker->classesFor('Diclofenac Sodium'));
        $this->assertSame([], $checker->classesFor('Vitamin C, Zinc Murakab'));
    }

    public function test_the_bag_warns_and_a_serious_warning_must_be_acknowledged_at_checkout(): void
    {
        Mail::fake();
        $panadol = Product::factory()->stock(10)->create(['name' => 'Panadol', 'generics' => 'Paracetamol', 'form' => 'tablet']);
        $plus = Product::factory()->stock(10)->create(['name' => 'Buscopan Plus', 'generics' => 'Hyoscine Butylbromide , Paracetamol', 'form' => 'tablet']);
        $cream = Product::factory()->stock(10)->create(['name' => 'Ketoconazole shampoo', 'generics' => 'Ketoconazole', 'form' => 'shampoo']);
        foreach ([$panadol, $plus, $cream] as $p) {
            $this->post(route('cart.store'), ['product_id' => $p->id, 'quantity' => 1]);
        }

        $warnings = $this->get(route('cart.index'))->viewData('page')['props']['cart']['warnings'];
        $this->assertCount(1, $warnings);
        $this->assertSame('major', $warnings[0]['severity']);
        $this->assertSame(['Buscopan Plus', 'Panadol'], $warnings[0]['products']);

        $this->post(route('checkout.store'), $this->details())->assertSessionHasErrors('interactions_ack');
        $this->assertSame(0, Order::count());

        $this->post(route('checkout.store'), $this->details(['interactions_ack' => true]))->assertRedirect();
        $order = Order::sole();
        $this->assertSame('Paracetamol in more than one product', $order->interaction_warnings[0]['title']);
    }

    public function test_topical_products_never_trigger_systemic_warnings(): void
    {
        $statin = Product::factory()->make(['name' => 'Statin', 'generics' => 'Atorvastatin', 'form' => 'tablet']);
        $shampoo = Product::factory()->make(['name' => 'Shampoo', 'generics' => 'Ketoconazole', 'form' => 'shampoo']);
        $tablet = Product::factory()->make(['name' => 'Tablet', 'generics' => 'Ketoconazole', 'form' => 'tablet']);
        $statin->id = 1;
        $shampoo->id = 2;
        $tablet->id = 3;
        $checker = app(InteractionChecker::class);
        $this->assertSame([], $checker->check([$statin, $shampoo]));
        $this->assertSame('major', $checker->check([$statin, $tablet])[0]['severity']);
    }

    /* ── refill reminders ──────────────────────────────────────────── */

    private function regularBuyer(Product $product, array $daysAgo): User
    {
        $user = User::factory()->create(['email' => 'regular@example.com']);
        foreach ($daysAgo as $i => $days) {
            $order = Order::create(['user_id' => $user->id, 'number' => 'ZV-RF-'.$i, 'status' => 'delivered', 'customer_name' => 'R', 'email' => $user->email, 'phone' => '1', 'address' => 'x', 'city' => 'Karachi', 'subtotal' => 100, 'total' => 100]);
            $order->forceFill(['created_at' => now()->subDays($days)])->save();
            $order->items()->create(['product_id' => $product->id, 'name' => $product->name, 'slug' => $product->slug, 'unit_price' => 100, 'quantity' => 2, 'line_total' => 200]);
        }
        DB::table('product_interactions')->insert(['visitor' => 'u:'.$user->id, 'user_id' => $user->id, 'product_id' => $product->id, 'purchases' => count($daysAgo), 'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        return $user->fresh();
    }

    public function test_refill_reminders_follow_the_buying_rhythm_and_are_sent_once_per_cycle(): void
    {
        Mail::fake();
        $product = Product::factory()->stock(20)->create(['name' => 'Glucophage']);
        // Bought 58 and 28 days ago: a 30-day rhythm, so it runs out in ~2 days.
        $user = $this->regularBuyer($product, [58, 28]);

        Artisan::call('refills:remind');
        Mail::assertSent(RefillReminderMail::class, fn ($mail) => $mail->hasTo('regular@example.com') && $mail->reminders->count() === 1);
        $reminder = RefillReminder::sole();
        $this->assertSame(30, $reminder->interval_days);
        $this->assertNotNull($reminder->sent_at);

        Artisan::call('refills:remind');
        Mail::assertSent(RefillReminderMail::class, 1); // not twice for the same cycle

        // The account page lists it, and one tap puts last time's quantity back in the bag.
        $this->actingAs($user);
        $refills = $this->get(route('account.dashboard'))->viewData('page')['props']['refills'];
        $this->assertCount(1, $refills['items']);
        $this->post(route('account.refills.add', $reminder))->assertRedirect(route('cart.index'));
        $this->assertSame(2, $this->get(route('cart.index'))->viewData('page')['props']['cart']['lines'][0]['quantity']);
    }

    public function test_refill_links_are_signed_and_reminders_can_be_turned_off(): void
    {
        Mail::fake();
        $product = Product::factory()->stock(20)->create();
        $user = $this->regularBuyer($product, [58, 28]);
        app(Refills::class)->sync($user);
        $reminder = RefillReminder::sole();

        $this->get(route('refills.reorder', $reminder))->assertForbidden();
        $this->get(URL::temporarySignedRoute('refills.reorder', now()->addDay(), ['reminder' => $reminder->id]))->assertRedirect(route('cart.index'));

        // Someone else can't add or dismiss it.
        $this->actingAs(User::factory()->create())->post(route('account.refills.add', $reminder))->assertNotFound();

        $this->actingAs($user)->put(route('account.preferences.update'), ['refill_reminders' => false]);
        Artisan::call('refills:remind');
        Mail::assertNothingSent();
    }

    public function test_one_off_purchases_never_trigger_reminders(): void
    {
        Mail::fake();
        $product = Product::factory()->stock(20)->create();
        $this->regularBuyer($product, [40]);
        Artisan::call('refills:remind');
        Mail::assertNothingSent();
        $this->assertSame(0, RefillReminder::count());
    }

    /* ── A/B variants survive sign-in ──────────────────────────────── */

    public function test_a_guest_keeps_the_variant_they_saw_after_signing_in(): void
    {
        config(['zovita.experiments' => ['hero_cta' => ['variants' => ['shop', 'symptom']]]]);
        $user = User::factory()->create();
        $experiments = app(Experiments::class);

        // Find a guest whose hashed variant differs from the account's, the case that used to flip.
        $userVariant = $experiments->variant('hero_cta', 'u:'.$user->id);
        $guest = collect(range(1, 50))->map(fn ($i) => 'g:guest-'.$i)->first(fn ($g) => $experiments->variant('hero_cta', $g) !== $userVariant);
        $guestVariant = $experiments->variant('hero_cta', $guest);

        $experiments->track('hero_cta', 'exposure', $guest);
        $experiments->track('hero_cta', 'click', $guest);
        $experiments->mergeGuestInto($guest, 'u:'.$user->id);

        $fresh = app(Experiments::class);
        $this->assertSame($guestVariant, $fresh->variant('hero_cta', 'u:'.$user->id));
        $this->assertSame(2, DB::table('experiment_events')->where('visitor', 'u:'.$user->id)->count());
        $this->assertSame(0, DB::table('experiment_events')->where('visitor', $guest)->count());
    }

    public function test_an_account_that_already_has_a_variant_keeps_its_own(): void
    {
        config(['zovita.experiments' => ['hero_cta' => ['variants' => ['shop', 'symptom']]]]);
        $experiments = app(Experiments::class);
        $experiments->track('hero_cta', 'exposure', 'u:7');
        $own = $experiments->variant('hero_cta', 'u:7');
        $guest = collect(range(1, 50))->map(fn ($i) => 'g:other-'.$i)->first(fn ($g) => $experiments->variant('hero_cta', $g) !== $own);
        $experiments->track('hero_cta', 'exposure', $guest);

        $experiments->mergeGuestInto($guest, 'u:7');
        $this->assertSame($own, app(Experiments::class)->variant('hero_cta', 'u:7'));
        $this->assertSame(1, DB::table('experiment_events')->where('visitor', $guest)->count()); // not double counted
    }

    /* ── shared stores for rate limits and bans ────────────────────── */

    public function test_rate_limit_counters_use_the_configured_store(): void
    {
        config(['cache.limiter' => 'file']);
        $this->app->forgetInstance(RateLimiter::class);
        $limiter = app(RateLimiter::class);
        $cache = (fn () => $this->cache)->call($limiter);
        $this->assertInstanceOf(FileStore::class, $cache->getStore());
    }

    public function test_ban_lookups_are_cached_and_a_new_ban_applies_immediately(): void
    {
        $guard = app(BanGuard::class);
        $signals = ['email' => 'spam@example.com'];
        $this->assertNull($guard->match($signals));
        $queries = 0;
        DB::listen(function ($q) use (&$queries) {
            if (str_contains($q->sql, 'ban_identifiers')) {
                $queries++;
            }
        });
        $this->assertNull($guard->match($signals));
        $this->assertSame(0, $queries, 'second look-up is served from the shared cache');

        $user = User::factory()->create(['email' => 'spam@example.com']);
        $admin = $this->makeStaff();
        $guard->ban($user, 'permanent', 'Spam', null, null, $admin);
        $this->assertInstanceOf(Ban::class, $guard->match($signals), 'issuing a ban invalidates every cached answer');

        $guard->lift($user, $admin);
        $this->assertNull($guard->match($signals));
    }

    /* ── malware scanning (against a real socket speaking clamd's protocol) ── */

    private $clamd;

    private function startFakeClamd(): int
    {
        $port = 39000 + random_int(0, 900);
        $this->clamd = proc_open([PHP_BINARY, base_path('tests/Support/fake-clamd.php'), (string) $port], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $this->assertSame("ready\n", fgets($pipes[1]));
        config(['zovita.scanner' => ['driver' => 'clamav', 'host' => '127.0.0.1', 'port' => $port, 'socket' => null, 'timeout' => 5, 'fail_open' => false]]);

        return $port;
    }

    protected function tearDown(): void
    {
        if ($this->clamd) {
            proc_terminate($this->clamd);
            proc_close($this->clamd);
        }
        parent::tearDown();
    }

    public function test_the_scanner_speaks_clamds_instream_protocol(): void
    {
        $this->startFakeClamd();
        $scanner = app(MalwareScanner::class);
        $clean = tempnam(sys_get_temp_dir(), 'scan');
        file_put_contents($clean, str_repeat('a clean prescription ', 2000)); // several chunks
        $infected = tempnam(sys_get_temp_dir(), 'scan');
        file_put_contents($infected, self::MALWARE);

        $this->assertSame(['status' => 'clean', 'signature' => null], $scanner->scan($clean));
        $this->assertSame(['status' => 'infected', 'signature' => 'Zovita-Test-Signature'], $scanner->scan($infected));
        unlink($clean);
        unlink($infected);
    }

    public function test_infected_prescriptions_are_rejected_and_clean_ones_marked_scanned(): void
    {
        Storage::fake('local');
        Mail::fake();
        $this->startFakeClamd();
        $form = ['name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '0300 1234567', 'consent' => '1'];

        $this->post(route('prescriptions.store'), $form + ['file' => UploadedFile::fake()->createWithContent('rx.pdf', '%PDF-1.4 '.self::MALWARE)])
            ->assertSessionHasErrors('file');
        $this->assertDatabaseCount('prescriptions', 0);

        $this->post(route('prescriptions.store'), $form + ['file' => UploadedFile::fake()->image('rx.png', 600, 800)])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('prescriptions', ['scan_status' => 'clean']);
    }

    public function test_an_unreachable_scanner_fails_closed_unless_configured_otherwise(): void
    {
        Storage::fake('local');
        Mail::fake();
        config(['zovita.scanner' => ['driver' => 'clamav', 'host' => '127.0.0.1', 'port' => 1, 'socket' => null, 'timeout' => 1, 'fail_open' => false]]);
        $form = ['name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '0300 1234567', 'consent' => '1'];

        $this->post(route('prescriptions.store'), $form + ['file' => UploadedFile::fake()->image('rx.png', 600, 800)])->assertSessionHasErrors('file');
        config(['zovita.scanner.fail_open' => true]);
        $this->post(route('prescriptions.store'), $form + ['file' => UploadedFile::fake()->image('rx.png', 600, 800)])->assertSessionHasNoErrors();
    }

    /* ── flash messages survive background requests ───────────────── */

    public function test_a_background_signal_does_not_swallow_the_next_pages_message(): void
    {
        $product = Product::factory()->stock(10)->create();
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 1])->assertSessionHas('success');

        // The A/B exposure beacon and a hover prefetch race the redirect...
        $this->postJson(route('signals.experiment'), ['experiment' => 'hero_cta', 'event' => 'exposure'])->assertOk();
        $version = (new HandleInertiaRequests)->version(request());
        $prefetch = $this->withHeaders(['Purpose' => 'prefetch', 'X-Inertia' => 'true', 'X-Inertia-Version' => (string) $version])->get(route('faq'));
        $this->assertNull($prefetch->json('props.flash.success'), 'a prefetch must not carry (and later replay) the toast');

        // ...and the real page still gets "Added to your bag".
        $flash = $this->withHeaders(['Purpose' => '', 'X-Inertia' => ''])->get(route('products.show', $product))->viewData('page')['props']['flash'];
        $this->assertStringStartsWith('Added to your bag', $flash['success']);
    }

    /* ── server-side rendering stays opt-in ────────────────────────── */

    public function test_ssr_is_off_unless_enabled(): void
    {
        $this->assertFalse(config('inertia.ssr.enabled'));
        $this->assertFileExists(resource_path('js/ssr.jsx'));
    }
}
