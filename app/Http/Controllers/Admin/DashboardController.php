<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Prescriptions\ReviewPrescription;
use App\Enums\OrderStatus;
use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Prescription;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Models\User;
use App\Services\Experiments\Experiments;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public const RANGES = [7, 30, 90];

    public function __invoke(Request $request, ReviewPrescription $review): Response
    {
        // Cron-less fallback (e.g. XAMPP): opening the dashboard also runs the 24h auto-approval.
        $review->autoApproveOverdue();

        $days = in_array((int) $request->query('days'), self::RANGES, true) ? (int) $request->query('days') : 30;
        $from = now()->subDays($days - 1)->startOfDay();
        $prevFrom = $from->copy()->subDays($days);
        $live = fn ($q) => $q->where('status', '!=', OrderStatus::Cancelled);

        $period = fn (Carbon $start, Carbon $end) => Order::query()->tap($live)->whereBetween('created_at', [$start, $end]);
        $current = $period($from, now());
        $previous = $period($prevFrom, $from->copy()->subSecond());

        $kpi = function ($query) {
            $row = (clone $query)->selectRaw('COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(offer_discount), 0) as offers')->first();

            return ['orders' => (int) $row->orders, 'revenue' => (float) $row->revenue, 'offers' => (float) $row->offers];
        };
        $now = $kpi($current);
        $before = $kpi($previous);
        $newUsers = User::where('created_at', '>=', $from)->count();
        $newUsersBefore = User::whereBetween('created_at', [$prevFrom, $from])->count();

        // Daily series (zero-filled so the chart has no gaps).
        $daily = Order::query()->tap($live)->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as orders, SUM(total) as revenue')
            ->groupBy('day')->get()->keyBy('day');
        $series = collect(range(0, $days - 1))->map(function ($i) use ($from, $daily) {
            $day = $from->copy()->addDays($i)->toDateString();

            return ['date' => $day, 'orders' => (int) ($daily[$day]->orders ?? 0), 'revenue' => round((float) ($daily[$day]->revenue ?? 0))];
        })->all();

        $topProducts = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.created_at', '>=', $from)->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->selectRaw('order_items.name, SUM(order_items.quantity) as units, SUM(order_items.line_total) as revenue')
            ->groupBy('order_items.name')->orderByDesc('revenue')->limit(8)->get()
            ->map(fn ($r) => ['label' => $r->name, 'value' => round((float) $r->revenue), 'units' => (int) $r->units])->all();

        $byDepartment = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('departments', 'departments.id', '=', 'products.department_id')
            ->where('orders.created_at', '>=', $from)->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->selectRaw('departments.name, SUM(order_items.line_total) as revenue')
            ->groupBy('departments.name')->orderByDesc('revenue')->get()
            ->map(fn ($r) => ['label' => $r->name, 'value' => round((float) $r->revenue)])->all();

        $statuses = Order::where('created_at', '>=', $from)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        // Behaviour funnel from the personalisation signals.
        $funnel = ProductInteraction::where('last_seen_at', '>=', $from)->selectRaw(
            'COUNT(DISTINCT visitor) as visitors,
             COUNT(DISTINCT CASE WHEN dwell_seconds >= 20 THEN visitor END) as engaged,
             COUNT(DISTINCT CASE WHEN cart_adds > 0 THEN visitor END) as carted,
             COUNT(DISTINCT CASE WHEN purchases > 0 THEN visitor END) as bought'
        )->first();

        $offerStats = Offer::selectRaw('kind, COUNT(*) as issued, SUM(CASE WHEN redeemed_at IS NOT NULL THEN 1 ELSE 0 END) as redeemed')
            ->where('created_at', '>=', $from)->groupBy('kind')->get()
            ->map(fn ($r) => ['label' => Offer::KINDS[$r->kind] ?? $r->kind, 'issued' => (int) $r->issued, 'redeemed' => (int) $r->redeemed])->all();

        return Inertia::render('Admin/Dashboard', [
            'days' => $days,
            'ranges' => self::RANGES,
            'kpis' => [
                ['label' => 'Revenue', 'value' => $now['revenue'], 'previous' => $before['revenue'], 'format' => 'money'],
                ['label' => 'Orders', 'value' => $now['orders'], 'previous' => $before['orders'], 'format' => 'number'],
                ['label' => 'Average order', 'value' => $now['orders'] ? $now['revenue'] / $now['orders'] : 0, 'previous' => $before['orders'] ? $before['revenue'] / $before['orders'] : 0, 'format' => 'money'],
                ['label' => 'New customers', 'value' => $newUsers, 'previous' => $newUsersBefore, 'format' => 'number'],
            ],
            'series' => $series,
            'topProducts' => $topProducts,
            'byDepartment' => $byDepartment,
            'statuses' => collect(OrderStatus::cases())->map(fn ($s) => ['label' => $s->label(), 'key' => $s->value, 'value' => (int) ($statuses[$s->value] ?? 0)])->all(),
            'funnel' => [
                ['label' => 'Viewed a product', 'value' => (int) $funnel->visitors],
                ['label' => 'Engaged 20s+', 'value' => (int) $funnel->engaged],
                ['label' => 'Added to bag', 'value' => (int) $funnel->carted],
                ['label' => 'Purchased', 'value' => (int) $funnel->bought],
            ],
            'offers' => ['total' => $now['offers'], 'byKind' => $offerStats],
            'experiments' => Experiments::report(),
            'attention' => [
                'prescriptions' => Prescription::whereIn('status', [PrescriptionStatus::Received, PrescriptionStatus::Reviewing])->count(),
                'lowStock' => Product::listed()->whereBetween('stock', [1, 5])->count(),
                'soldOut' => Product::listed()->where('stock', 0)->count(),
                'pendingOrders' => Order::where('status', OrderStatus::Pending)->count(),
            ],
            'recentOrders' => Order::withCount('items')->latest()->limit(6)->get()->map(fn (Order $o) => $o->toSummary() + ['customer' => $o->customer_name, 'city' => $o->city])->all(),
            'customers' => ['total' => User::count(), 'banned' => User::whereNotNull('banned_at')->count(), 'active24h' => User::where('last_seen_at', '>=', now()->subDay())->count()],
            'catalog' => ['products' => Product::listed()->count(), 'stockValue' => round((float) Product::listed()->sum(DB::raw('stock * COALESCE(sale_price, price)')))],
        ]);
    }
}
