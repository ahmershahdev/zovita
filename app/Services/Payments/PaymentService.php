<?php

namespace App\Services\Payments;

use App\Actions\Orders\PlaceOrder;
use App\Enums\OrderStatus;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Services\Security\ActivityLog;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Card payments, from checkout to refund. The rules:
 *
 *  - The webhook is the source of truth: a payment is "paid" only when a correctly signed,
 *    fresh, never-seen-before event says so AND its amount and currency match what we asked for.
 *  - Every state change locks the order row first (then the payment), so a webhook, the expiry job
 *    and an admin refund can't interleave on the same order.
 *  - Card orders reserve stock while awaiting payment; if nobody pays in time they're cancelled,
 *    restocked and their offers released. Money that still arrives later is refunded automatically.
 *  - Refunds can never exceed what was captured, however many people press the button.
 */
class PaymentService
{
    public function driver(): string
    {
        return (string) config('payments.driver', 'none');
    }

    public function enabled(): bool
    {
        return in_array($this->driver(), ['stripe', 'sandbox'], true)
            && ! ($this->driver() === 'sandbox' && app()->isProduction());
    }

    public function gateway(?string $name = null): PaymentGateway
    {
        $name ??= $this->driver();

        return match (true) {
            $name === 'stripe' => app(StripeGateway::class),
            $name === 'sandbox' && ! app()->isProduction() => app(SandboxGateway::class),
            default => throw new RuntimeException("Payment driver [{$name}] is not available."),
        };
    }

    /** Hosted checkout URL for an order awaiting card payment (reuses an open session). */
    public function start(Order $order): string
    {
        abort_unless($order->status === OrderStatus::AwaitingPayment && $order->payment_status === 'pending', 409);

        $open = $order->payments()->where('status', Payment::PENDING)->whereNotNull('checkout_url')->latest('id')->first();
        if ($open) {
            return $open->checkout_url;
        }

        $gateway = $this->gateway();
        $payment = $order->payments()->create([
            'provider' => $gateway->name(),
            'status' => Payment::PENDING,
            'amount' => $order->total,
            'currency' => config('payments.currency', 'PKR'),
        ]);
        $session = $gateway->createCheckout($payment, $order);
        $payment->update(['reference' => $session['reference'], 'checkout_url' => $session['url']]);

        return $session['url'];
    }

    /**
     * Verifies and applies one webhook delivery.
     *
     * @return string what happened (for logs and tests)
     */
    public function handleWebhook(string $provider, string $payload, ?string $signature): string
    {
        $gateway = $this->gateway($provider);
        if (! $this->validSignature($payload, (string) $signature, $gateway->webhookSecret())) {
            throw new InvalidWebhook('Signature check failed.');
        }

        $event = json_decode($payload, true);
        $id = $event['id'] ?? null;
        $type = $event['type'] ?? null;
        $object = $event['data']['object'] ?? null;
        if (! is_string($id) || ! is_string($type) || ! is_array($object)) {
            throw new InvalidWebhook('Malformed event.');
        }

        // Each event id is applied at most once, even if the gateway retries or two deliveries race.
        try {
            DB::table('webhook_events')->insert(['provider' => $provider, 'event_id' => $id, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
        } catch (UniqueConstraintViolationException) {
            return 'duplicate';
        }

        try {
            $result = $this->apply($type, $object);
        } catch (\Throwable $e) {
            // Not applied: forget the event so the gateway's retry gets another chance.
            DB::table('webhook_events')->where('provider', $provider)->where('event_id', $id)->delete();
            throw $e;
        }
        DB::table('webhook_events')->where('provider', $provider)->where('event_id', $id)->update(['processed_at' => now()]);

        return $result;
    }

    private function apply(string $type, array $object): string
    {
        return match ($type) {
            'checkout.session.completed', 'checkout.session.async_payment_succeeded' => ($object['payment_status'] ?? null) === 'paid'
                ? $this->paid($object['id'] ?? '', $object['payment_intent'] ?? null, (int) ($object['amount_total'] ?? -1), (string) ($object['currency'] ?? ''))
                : 'awaiting',
            'checkout.session.expired', 'checkout.session.async_payment_failed' => $this->failed($object['id'] ?? ''),
            'charge.refunded' => $this->refundedRemotely($object['payment_intent'] ?? '', (int) ($object['amount_refunded'] ?? 0)),
            default => 'ignored',
        };
    }

    /** Cancels a card order that wasn't paid in time: stock back on the shelf, offers released. */
    public function expire(Order $order): bool
    {
        return DB::transaction(function () use ($order) {
            $locked = Order::with('items')->whereKey($order->id)->lockForUpdate()->first();
            if (! $locked || $locked->status !== OrderStatus::AwaitingPayment || $locked->payment_status !== 'pending') {
                return false;
            }
            foreach ($locked->items as $item) {
                if ($item->product_id) {
                    DB::table('products')->where('id', $item->product_id)->increment('stock', $item->quantity);
                }
            }
            Offer::where('order_id', $locked->id)->update(['redeemed_at' => null, 'order_id' => null]);
            $locked->payments()->where('status', Payment::PENDING)->update(['status' => Payment::EXPIRED]);
            $locked->update(['status' => OrderStatus::Cancelled, 'payment_status' => 'expired', 'payment_expires_at' => null]);
            ActivityLog::record('order.payment_expired', "Order {$locked->number} cancelled: card payment not completed in time", $locked->user, ['order' => $locked->number]);

            return true;
        });
    }

    /**
     * Refunds up to what's left on the order's captured card payment.
     *
     * @throws ValidationException
     */
    public function refund(Order $order, float $amount, ?User $by = null, ?string $reason = null): Refund
    {
        $amount = round($amount, 2);

        return DB::transaction(function () use ($order, $amount, $by, $reason) {
            Order::whereKey($order->id)->lockForUpdate()->first();
            $payment = Payment::where('order_id', $order->id)->whereIn('status', [Payment::PAID, Payment::PARTIALLY_REFUNDED])->lockForUpdate()->latest('id')->first();
            if (! $payment) {
                throw ValidationException::withMessages(['amount' => 'There is no card payment on this order to refund.']);
            }
            if ($amount <= 0 || $amount > $payment->refundable()) {
                throw ValidationException::withMessages(['amount' => 'You can refund between PKR 1 and PKR '.number_format($payment->refundable(), 2).'.']);
            }

            $result = $this->gateway($payment->provider)->refund($payment, $amount);
            $refund = $payment->refunds()->create([
                'created_by' => $by?->id,
                'reference' => $result['reference'],
                'amount' => $amount,
                'status' => $result['status'],
                'reason' => $reason,
            ]);
            $this->applyRefunded($payment, round($payment->refunded_amount + $amount, 2));
            ActivityLog::record('order.refunded', 'Refunded PKR '.number_format($amount, 2)." on {$order->number}".($reason ? " ({$reason})" : ''), $by, ['order' => $order->number]);

            return $refund;
        });
    }

    private function paid(string $reference, ?string $intent, int $amountMinor, string $currency): string
    {
        $outcome = DB::transaction(function () use ($reference, $intent, $amountMinor, $currency) {
            $payment = Payment::where('reference', $reference)->first();
            if (! $payment) {
                return 'unknown';
            }
            $order = Order::whereKey($payment->order_id)->lockForUpdate()->first();
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
            if ($payment->status === Payment::PAID || $payment->status === Payment::REFUNDED) {
                return 'already';
            }
            if ($amountMinor !== (int) round($payment->amount * 100) || strtolower($currency) !== strtolower($payment->currency)) {
                ActivityLog::record('payment.mismatch', "Payment for {$order->number} reported {$amountMinor} {$currency}, expected ".round($payment->amount * 100)." {$payment->currency}", meta: ['order' => $order->number]);

                return 'mismatch';
            }

            $payment->update(['status' => Payment::PAID, 'intent' => $intent, 'paid_at' => now()]);

            if ($order->status !== OrderStatus::AwaitingPayment) {
                // Paid after we gave up on it (expired / cancelled): the stock is gone, give the money back.
                return 'late:'.$payment->id;
            }
            $order->update(['status' => OrderStatus::Pending, 'payment_status' => 'paid', 'paid_at' => now(), 'payment_expires_at' => null]);

            return 'paid:'.$order->id;
        });

        if (str_starts_with($outcome, 'late:')) {
            $payment = Payment::find((int) substr($outcome, 5));
            $this->refund($payment->order, $payment->amount, null, 'Payment arrived after the order had been cancelled');

            return 'refunded_late';
        }
        if (str_starts_with($outcome, 'paid:')) {
            app(PlaceOrder::class)->confirmed(Order::find((int) substr($outcome, 5)));

            return 'paid';
        }

        return $outcome;
    }

    private function failed(string $reference): string
    {
        $payment = Payment::where('reference', $reference)->first();
        if (! $payment) {
            return 'unknown';
        }
        Payment::whereKey($payment->id)->where('status', Payment::PENDING)->update(['status' => Payment::FAILED]);

        return $this->expire($payment->order) ? 'expired' : 'noop';
    }

    private function refundedRemotely(string $intent, int $refundedMinor): string
    {
        return DB::transaction(function () use ($intent, $refundedMinor) {
            $payment = Payment::where('intent', $intent)->lockForUpdate()->first();
            if (! $payment) {
                return 'unknown';
            }
            $total = round($refundedMinor / 100, 2);
            if ($total > $payment->refunded_amount) {
                $payment->refunds()->create(['amount' => round($total - $payment->refunded_amount, 2), 'status' => 'succeeded', 'reason' => 'Refunded in the gateway dashboard']);
                $this->applyRefunded($payment, $total);
            }

            return 'synced';
        });
    }

    private function applyRefunded(Payment $payment, float $refunded): void
    {
        $refunded = min($refunded, $payment->amount);
        $full = $refunded >= $payment->amount;
        $payment->update(['refunded_amount' => $refunded, 'status' => $full ? Payment::REFUNDED : Payment::PARTIALLY_REFUNDED]);
        Order::whereKey($payment->order_id)->update(['refunded_amount' => $refunded, 'payment_status' => $full ? 'refunded' : 'partially_refunded']);
    }

    /** Stripe-style "t=…,v1=…" HMAC-SHA256 over "t.payload", within the tolerance window. */
    private function validSignature(string $payload, string $header, string $secret): bool
    {
        if ($secret === '' || $header === '') {
            return false;
        }
        $parts = [];
        foreach (explode(',', $header) as $piece) {
            [$k, $v] = array_pad(explode('=', trim($piece), 2), 2, '');
            $parts[$k][] = $v;
        }
        $timestamp = (int) ($parts['t'][0] ?? 0);
        if (abs(now()->getTimestamp() - $timestamp) > (int) config('payments.webhook_tolerance', 300)) {
            return false;
        }
        $expected = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);
        foreach ($parts['v1'] ?? [] as $candidate) {
            if (hash_equals($expected, $candidate)) {
                return true;
            }
        }

        return false;
    }
}
