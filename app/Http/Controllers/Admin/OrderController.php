<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Refund;
use App\Services\Payments\PaymentService;
use App\Services\Security\ActivityLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('q'));
        $like = '%'.addcslashes($search, '%_\\').'%';

        $orders = Order::withCount('items')
            ->when(OrderStatus::tryFrom((string) $status), fn ($q, $s) => $q->where('status', $s))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('number', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('customer_name', 'like', $like)))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Order $o) => $o->toSummary() + [
                'id' => $o->id,
                'customer' => $o->customer_name,
                'email' => $o->email,
                'city' => $o->city,
                'phone' => $o->phone,
                'rx' => (bool) $o->prescription_id,
            ]);

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'filters' => ['status' => $status, 'q' => $search],
            'statuses' => self::statuses(),
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $order->load('items', 'prescription', 'user', 'payments.refunds.author');
        $payment = $order->payments->whereIn('status', ['paid', 'partially_refunded', 'refunded'])->last();

        return Inertia::render('Admin/Order', [
            'order' => $order->toDetail() + [
                'id' => $order->id,
                'payment' => $payment ? [
                    'provider' => $payment->provider,
                    'amount' => $payment->amount,
                    'refunded' => $payment->refunded_amount,
                    'refundable' => $payment->refundable(),
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'refunds' => $payment->refunds->map(fn (Refund $r) => [
                        'amount' => $r->amount,
                        'reason' => $r->reason,
                        'by' => $r->author?->name,
                        'at' => $r->created_at->toIso8601String(),
                    ])->values(),
                ] : null,
                'can_refund' => $request->user()->canStaff('payments.refund'),
                'prescription' => $order->prescription ? [
                    'reference' => $order->prescription->reference,
                    'status' => $order->prescription->status->label(),
                ] : null,
                'account' => $order->user?->only('id', 'name', 'email'),
            ],
            'statuses' => self::statuses(),
        ]);
    }

    /**
     * Status change; cancelling restores stock exactly once, inside a locked transaction. Orders
     * awaiting card payment are left to the payment flow, and cancelling a paid card order also
     * refunds what's left on it (so only staff allowed to refund may do that).
     */
    public function update(Request $request, Order $order, PaymentService $payments): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::enum(OrderStatus::class)]]);
        $next = OrderStatus::from($data['status']);

        if ($next === OrderStatus::AwaitingPayment || $order->status === OrderStatus::AwaitingPayment) {
            return back()->with('error', 'This order is waiting for the customer\'s card payment. It moves on by itself once paid, or is cancelled automatically if it isn\'t.');
        }
        $paidByCard = $order->payment_method === 'card' && in_array($order->payment_status, ['paid', 'partially_refunded'], true);
        if ($next === OrderStatus::Cancelled && $paidByCard && ! $request->user()->canStaff('payments.refund')) {
            return back()->with('error', 'This order was paid by card. Only someone who can issue refunds can cancel it.');
        }

        $cancelled = DB::transaction(function () use ($order, $next) {
            $locked = Order::with('items')->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === $next) {
                return false;
            }
            if ($next === OrderStatus::Cancelled) {
                foreach ($locked->items as $item) {
                    if ($item->product_id) {
                        DB::table('products')->where('id', $item->product_id)->increment('stock', $item->quantity);
                    }
                }
            }
            $locked->update(['status' => $next]);

            return $next === OrderStatus::Cancelled;
        });

        if ($cancelled && $paidByCard) {
            $left = round($order->total - $order->fresh()->refunded_amount, 2);
            if ($left > 0) {
                $payments->refund($order, $left, $request->user(), 'Order cancelled');

                return back()->with('success', "Order {$order->number} cancelled and PKR ".number_format($left, 2).' refunded to the card.');
            }
        }
        ActivityLog::record('admin.order.status', "Set {$order->number} to {$next->label()}", $request->user(), ['order' => $order->number]);

        return back()->with('success', "Order {$order->number} is now: {$next->label()}.");
    }

    public function refund(Request $request, Order $order, PaymentService $payments): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);
        $payments->refund($order, (float) $data['amount'], $request->user(), $data['reason'] ?? null);

        return back()->with('success', 'Refunded PKR '.number_format((float) $data['amount'], 2)." on {$order->number}.");
    }

    private static function statuses(): array
    {
        return collect(OrderStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->all();
    }
}
