<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
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

    public function show(Order $order): Response
    {
        $order->load('items', 'prescription', 'user');

        return Inertia::render('Admin/Order', [
            'order' => $order->toDetail() + [
                'id' => $order->id,
                'prescription' => $order->prescription ? [
                    'reference' => $order->prescription->reference,
                    'status' => $order->prescription->status->label(),
                ] : null,
                'account' => $order->user?->only('id', 'name', 'email'),
            ],
            'statuses' => self::statuses(),
        ]);
    }

    /** Status change; cancelling restores stock exactly once, inside a locked transaction. */
    public function update(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::enum(OrderStatus::class)]]);
        $next = OrderStatus::from($data['status']);

        DB::transaction(function () use ($order, $next) {
            $locked = Order::with('items')->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === $next) {
                return;
            }
            if ($next === OrderStatus::Cancelled) {
                foreach ($locked->items as $item) {
                    if ($item->product_id) {
                        DB::table('products')->where('id', $item->product_id)->increment('stock', $item->quantity);
                    }
                }
            }
            $locked->update(['status' => $next]);
        });

        return back()->with('success', "Order {$order->number} is now: {$next->label()}.");
    }

    private static function statuses(): array
    {
        return collect(OrderStatus::cases())->map(fn ($s) => ['value' => $s->value, 'label' => $s->label()])->all();
    }
}
