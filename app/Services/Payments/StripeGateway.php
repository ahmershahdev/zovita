<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Stripe Checkout over the REST API (no SDK). The amount is sent as one line for the whole order,
 * computed on the server; the browser never chooses what it pays. Idempotency keys stop a retried
 * request from creating a second session or refund.
 */
class StripeGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'stripe';
    }

    public function createCheckout(Payment $payment, Order $order): array
    {
        $response = $this->client()
            ->withHeaders(['Idempotency-Key' => 'zovita-checkout-'.$payment->id])
            ->asForm()
            ->post('/checkout/sessions', [
                'mode' => 'payment',
                'client_reference_id' => $order->number,
                'customer_email' => $order->email,
                'success_url' => route('payments.return', $order).'?session={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('payments.return', $order).'?cancelled=1',
                // Stripe's minimum session lifetime is 30 minutes.
                'expires_at' => now()->addMinutes(max(30, (int) config('payments.expires_minutes')))->timestamp,
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => strtolower($payment->currency),
                        'unit_amount' => (int) round($payment->amount * 100),
                        'product_data' => ['name' => 'Zovita+ order '.$order->number],
                    ],
                ]],
                'metadata' => ['payment_id' => $payment->id, 'order_number' => $order->number],
            ]);

        if (! $response->successful() || ! $response->json('id') || ! $response->json('url')) {
            throw new RuntimeException('Stripe checkout failed: '.$response->json('error.message', $response->status()));
        }

        return ['reference' => $response->json('id'), 'url' => $response->json('url')];
    }

    public function refund(Payment $payment, float $amount): array
    {
        if (! $payment->intent) {
            throw new RuntimeException('This payment has no Stripe payment intent to refund.');
        }
        $response = $this->client()
            ->withHeaders(['Idempotency-Key' => 'zovita-refund-'.$payment->id.'-'.$payment->refunds()->count().'-'.(int) round($amount * 100)])
            ->asForm()
            ->post('/refunds', [
                'payment_intent' => $payment->intent,
                'amount' => (int) round($amount * 100),
                'metadata' => ['payment_id' => $payment->id],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Stripe refund failed: '.$response->json('error.message', $response->status()));
        }

        return ['reference' => $response->json('id'), 'status' => (string) $response->json('status', 'pending')];
    }

    public function webhookSecret(): string
    {
        return (string) config('payments.stripe.webhook_secret');
    }

    private function client()
    {
        $secret = config('payments.stripe.secret');
        if (! $secret) {
            throw new RuntimeException('STRIPE_SECRET is not set.');
        }

        return Http::baseUrl(config('payments.stripe.api'))->withToken($secret)->timeout(15)->retry(2, 300, throw: false);
    }
}
