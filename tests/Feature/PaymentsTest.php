<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\StaffRole;
use App\Mail\OrderPlacedMail;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Services\Payments\SandboxGateway;
use App\Services\Payments\StripeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['payments.driver' => 'sandbox']);
        Mail::fake();
    }

    private function details(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ayesha Khan', 'email' => 'ayesha@example.com', 'phone' => '0300 1234567',
            'address' => 'House 12, Street 4, Gulberg III', 'city' => 'Lahore', 'payment_method' => 'card',
        ], $overrides);
    }

    /** Places a card order for one product and returns it with its open sandbox payment. */
    private function cardOrder(Product $product, int $qty = 2): array
    {
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => $qty]);
        $response = $this->post(route('checkout.store'), $this->details());
        $order = Order::sole();
        $payment = Payment::sole();
        $response->assertRedirect(route('payments.sandbox.show', $payment));

        return [$order, $payment];
    }

    private function webhook(string $type, array $object, ?string $secret = null, ?int $timestamp = null, ?string $eventId = null)
    {
        $payload = json_encode(['id' => $eventId ?? 'evt_'.Str::random(12), 'type' => $type, 'data' => ['object' => $object]]);
        $signature = SandboxGateway::sign($payload, $secret ?? config('payments.sandbox.webhook_secret'), $timestamp);

        return $this->call('POST', route('webhooks.payments', 'sandbox'), [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => $signature], $payload);
    }

    private function paidEvent(Payment $payment, ?int $amountMinor = null): array
    {
        return ['id' => $payment->reference, 'payment_status' => 'paid', 'payment_intent' => 'pi_test_1', 'currency' => 'pkr', 'amount_total' => $amountMinor ?? (int) round($payment->amount * 100)];
    }

    public function test_card_checkout_reserves_stock_and_waits_for_the_webhook(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);

        $this->assertSame(OrderStatus::AwaitingPayment, $order->status);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame(8, $product->fresh()->stock, 'stock is held while the customer pays');
        $this->assertEquals($order->total, $payment->amount);
        Mail::assertNothingSent(); // no "order confirmed" until it is paid

        // The return page never marks anything as paid on its own.
        $this->get(route('payments.return', $order))->assertOk();
        $this->assertSame('pending', $order->fresh()->payment_status);
    }

    public function test_a_signed_webhook_marks_the_order_paid_exactly_once(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);

        $this->webhook('checkout.session.completed', $this->paidEvent($payment), eventId: 'evt_same')->assertOk()->assertJson(['result' => 'paid']);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment), eventId: 'evt_same')->assertOk()->assertJson(['result' => 'duplicate']);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment))->assertOk()->assertJson(['result' => 'already']);

        $order->refresh();
        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame(Payment::PAID, $payment->fresh()->status);
        Mail::assertSent(OrderPlacedMail::class, 2); // customer + team, once
        // Purchase signal credited to whoever placed the order (the webhook itself has no session).
        $this->assertSame(1, ProductInteraction::where('visitor', $order->visitor)->where('product_id', $product->id)->value('purchases'));
        $this->get(route('payments.return', $order))->assertRedirect(route('checkout.success', $order));
    }

    public function test_forged_stale_or_wrong_amount_webhooks_change_nothing(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);

        $this->webhook('checkout.session.completed', $this->paidEvent($payment), secret: 'whsec_attacker')->assertStatus(400);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment), timestamp: now()->subMinutes(10)->getTimestamp())->assertStatus(400);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment, amountMinor: 100))->assertOk()->assertJson(['result' => 'mismatch']);
        $this->post(route('webhooks.payments', 'sandbox'), ['type' => 'checkout.session.completed'])->assertStatus(400);

        $this->assertSame('pending', $order->fresh()->payment_status);
        Mail::assertNothingSent();
    }

    public function test_unpaid_orders_expire_restock_and_release_offers_and_late_money_is_refunded(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);
        $offer = Offer::create(['visitor' => 'g:x', 'kind' => 'welcome', 'percent' => 5, 'reason' => 'x', 'expires_at' => now()->addDay(), 'redeemed_at' => now(), 'order_id' => $order->id]);

        $this->travel(31)->minutes();
        Artisan::call('payments:expire');

        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled, $order->status);
        $this->assertSame('expired', $order->payment_status);
        $this->assertSame(10, $product->fresh()->stock);
        $this->assertNull($offer->fresh()->redeemed_at);
        $this->assertSame(Payment::EXPIRED, $payment->fresh()->status);

        // Running it again does nothing (no double restock).
        Artisan::call('payments:expire');
        $this->assertSame(10, $product->fresh()->stock);

        // The bank confirms anyway: the stock is gone, so the money goes straight back.
        $payment->update(['status' => Payment::PENDING]);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment))->assertJson(['result' => 'refunded_late']);
        $this->assertSame(Payment::REFUNDED, $payment->fresh()->status);
        $this->assertSame('refunded', $order->fresh()->payment_status);
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
    }

    public function test_owners_refund_part_or_all_but_never_more_than_was_paid(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment));
        $total = $order->fresh()->total;

        $this->actingAsStaff($this->makeStaff(StaffRole::Pharmacist))
            ->post(route('admin.orders.refund', $order), ['amount' => 100])->assertForbidden();

        $owner = $this->makeStaff(StaffRole::Owner);
        $this->actingAsStaff($owner)->post(route('admin.orders.refund', $order), ['amount' => 100, 'reason' => 'One item out of stock'])->assertSessionHas('success');
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
        $this->assertEquals(100, $order->fresh()->refunded_amount);

        $this->post(route('admin.orders.refund', $order), ['amount' => $total])->assertSessionHasErrors('amount');
        $this->post(route('admin.orders.refund', $order), ['amount' => $total - 100])->assertSessionHas('success');
        $this->assertSame('refunded', $order->fresh()->payment_status);
        $this->assertSame(Payment::REFUNDED, $payment->fresh()->status);
        $this->assertSame(2, $payment->refunds()->count());
        $this->post(route('admin.orders.refund', $order), ['amount' => 1])->assertSessionHasErrors('amount');
    }

    public function test_cancelling_a_paid_order_refunds_the_card_and_restocks(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);
        $this->webhook('checkout.session.completed', $this->paidEvent($payment));

        // Support can move orders along but not cancel a paid one (that's a refund).
        $this->actingAsStaff($this->makeStaff(StaffRole::Support))
            ->patch(route('admin.orders.update', $order), ['status' => 'cancelled'])->assertSessionHas('error');
        $this->assertSame(OrderStatus::Pending, $order->fresh()->status);

        $this->actingAsStaff($this->makeStaff(StaffRole::Owner))
            ->patch(route('admin.orders.update', $order), ['status' => 'cancelled'])->assertSessionHas('success');
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
        $this->assertSame('refunded', $order->fresh()->payment_status);
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_the_sandbox_page_pays_through_the_real_webhook_path(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);

        $this->get(route('payments.sandbox.show', $payment))->assertOk();
        $this->post(route('payments.sandbox.complete', $payment), ['outcome' => 'pay'])->assertRedirect(route('payments.return', $order));
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame(1, \DB::table('webhook_events')->where('provider', 'sandbox')->count());
    }

    public function test_declining_in_the_sandbox_cancels_and_restocks(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);
        $this->post(route('payments.sandbox.complete', $payment), ['outcome' => 'decline']);

        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_someone_elses_payment_pages_are_hidden(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        [$order, $payment] = $this->cardOrder($product);
        $this->flushSession();

        $this->get(route('payments.return', $order))->assertNotFound();
        $this->get(route('payments.sandbox.show', $payment))->assertNotFound();
        $this->post(route('payments.sandbox.complete', $payment), ['outcome' => 'pay'])->assertNotFound();
    }

    public function test_card_is_refused_when_payments_are_off(): void
    {
        config(['payments.driver' => 'none']);
        $product = Product::factory()->stock(10)->create();
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 1]);
        $this->post(route('checkout.store'), $this->details())->assertSessionHasErrors('payment_method');
        $this->assertSame(0, Order::count());
    }

    public function test_cash_on_delivery_is_unchanged(): void
    {
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 1]);
        $this->post(route('checkout.store'), $this->details(['payment_method' => 'cod']))->assertRedirect(route('checkout.success', Order::sole()));
        $this->assertSame(OrderStatus::Pending, Order::sole()->status);
        $this->assertSame('unpaid', Order::sole()->payment_status);
        $this->assertSame(0, Payment::count());
        Mail::assertSent(OrderPlacedMail::class, 2);
    }

    public function test_the_stripe_driver_sends_the_server_amount_and_refunds_by_intent(): void
    {
        config(['payments.driver' => 'stripe', 'payments.stripe.secret' => 'sk_test_x', 'payments.stripe.webhook_secret' => 'whsec_x']);
        Http::fake([
            'api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_1', 'url' => 'https://checkout.stripe.com/c/pay/cs_test_1']),
            'api.stripe.com/v1/refunds' => Http::response(['id' => 're_1', 'status' => 'succeeded']),
        ]);
        $product = Product::factory()->stock(10)->create(['price' => 500]);
        $this->post(route('cart.store'), ['product_id' => $product->id, 'quantity' => 2]);
        $this->post(route('checkout.store'), $this->details())->assertRedirect('https://checkout.stripe.com/c/pay/cs_test_1');

        $order = Order::sole();
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/checkout/sessions')
            && $request['line_items'][0]['price_data']['unit_amount'] === (int) round($order->total * 100)
            && $request['line_items'][0]['price_data']['currency'] === 'pkr'
            && $request->hasHeader('Idempotency-Key'));

        $payment = Payment::sole();
        $this->assertSame('cs_test_1', $payment->reference);
        $payment->update(['status' => Payment::PAID, 'intent' => 'pi_1']);
        app(StripeGateway::class)->refund($payment, 50);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/refunds') && $request['payment_intent'] === 'pi_1' && $request['amount'] === 5000);
    }
}
