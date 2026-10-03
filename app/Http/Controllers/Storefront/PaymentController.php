<?php

namespace App\Http\Controllers\Storefront;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\PaymentService;
use App\Services\Payments\SandboxGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Where the shopper lands after the hosted card page, plus the sandbox gateway's own page. The
 * return URL never marks anything as paid: it only shows what the verified webhook decided.
 */
class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function show(Request $request, Order $order): Response|RedirectResponse
    {
        $this->authorizeOrder($request, $order);
        if ($order->payment_status === 'paid' || $order->payment_method !== 'card') {
            return to_route('checkout.success', $order);
        }

        return Inertia::render('Checkout/Payment', [
            'order' => [
                'number' => $order->number,
                'total' => $order->total,
                'status' => $order->status->value,
                'payment_status' => $order->payment_status,
                'payment_status_label' => Order::paymentLabel($order->payment_method, $order->payment_status),
                'expires_at' => $order->payment_expires_at?->toIso8601String(),
            ],
            'cancelled' => $request->boolean('cancelled'),
            'canRetry' => $order->status === OrderStatus::AwaitingPayment && $order->payment_status === 'pending',
        ]);
    }

    public function retry(Request $request, Order $order): SymfonyResponse
    {
        $this->authorizeOrder($request, $order);
        if ($order->status !== OrderStatus::AwaitingPayment || $order->payment_status !== 'pending') {
            return to_route('payments.return', $order);
        }
        // A cancelled hosted session can't be reused: close it so start() opens a fresh one.
        $order->payments()->where('status', Payment::PENDING)->update(['status' => Payment::FAILED]);

        return Inertia::location($this->payments->start($order));
    }

    /** Sandbox gateway's "hosted page" (local/dev/testing only). */
    public function sandbox(Request $request, Payment $payment): Response
    {
        abort_unless($this->payments->driver() === 'sandbox' && ! app()->isProduction() && $payment->provider === 'sandbox', 404);
        $this->authorizeOrder($request, $payment->order);

        return Inertia::render('Checkout/SandboxPay', [
            'payment' => ['id' => $payment->id, 'amount' => $payment->amount, 'currency' => $payment->currency, 'status' => $payment->status],
            'order' => ['number' => $payment->order->number],
        ]);
    }

    /** Sandbox: delivers a signed webhook through the real verification path, then returns. */
    public function sandboxComplete(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless($this->payments->driver() === 'sandbox' && ! app()->isProduction() && $payment->provider === 'sandbox', 404);
        $this->authorizeOrder($request, $payment->order);
        $outcome = $request->validate(['outcome' => ['required', 'in:pay,decline']])['outcome'];

        $object = ['id' => $payment->reference, 'object' => 'checkout.session', 'currency' => strtolower($payment->currency), 'amount_total' => (int) round($payment->amount * 100)];
        $event = $outcome === 'pay'
            ? ['type' => 'checkout.session.completed', 'object' => $object + ['payment_status' => 'paid', 'payment_intent' => 'sbx_pi_'.Str::random(20)]]
            : ['type' => 'checkout.session.expired', 'object' => $object + ['payment_status' => 'unpaid']];
        $payload = json_encode(['id' => 'sbx_evt_'.Str::random(20), 'type' => $event['type'], 'data' => ['object' => $event['object']]]);

        $this->payments->handleWebhook('sandbox', $payload, SandboxGateway::sign($payload, (string) config('payments.sandbox.webhook_secret')));

        return redirect()->route('payments.return', $payment->order)->with($outcome === 'pay' ? 'success' : 'error', $outcome === 'pay' ? 'Payment received.' : 'Payment declined.');
    }

    private function authorizeOrder(Request $request, Order $order): void
    {
        $owns = $request->session()->get('checkout.last_order') === $order->number
            || ($order->user_id && $order->user_id === $request->user()?->id);
        abort_unless($owns, 404);
    }
}
