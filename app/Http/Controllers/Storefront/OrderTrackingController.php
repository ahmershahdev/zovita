<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Guest order tracking without putting personal data in the URL:
 *   GET  /track-order           lookup form
 *   POST /track-order           number + email (rate limited) → on a match the order number is
 *                               remembered in this session and we redirect to…
 *   GET  /track-order/{number}  …the clean tracking page, visible only to that session, the signed-in
 *                               owner, or the checkout session that placed the order.
 */
class OrderTrackingController extends Controller
{
    private const SESSION_KEY = 'tracking.orders';

    public function create(Request $request): Response
    {
        return Inertia::render('Orders/Track', [
            'order' => null,
            'recent' => $request->user()?->orders()->latest()->limit(5)->get(['number', 'status', 'total', 'created_at'])
                ->map(fn (Order $o) => ['number' => $o->number, 'status' => $o->status->label(), 'total' => $o->total, 'date' => $o->created_at->toDateString()]) ?? [],
        ]);
    }

    public function lookup(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'number' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email', 'max:120'],
        ]);

        $order = Order::where('number', strtoupper(trim($data['number'])))
            ->where('email', strtolower(trim($data['email'])))
            ->first();

        if (! $order) {
            return back()->withErrors(['number' => "We couldn't find an order with that number and email."])->withInput($request->only('number', 'email'));
        }

        $tracked = array_slice(array_unique([$order->number, ...(array) $request->session()->get(self::SESSION_KEY, [])]), 0, 10);
        $request->session()->put(self::SESSION_KEY, $tracked);

        return to_route('orders.track.show', $order);
    }

    public function show(Request $request, Order $order): Response|RedirectResponse
    {
        $allowed = in_array($order->number, (array) $request->session()->get(self::SESSION_KEY, []), true)
            || $request->session()->get('checkout.last_order') === $order->number
            || ($order->user_id && $order->user_id === $request->user()?->id);

        if (! $allowed) {
            return to_route('orders.track')->with('error', 'Enter your order number and email to view this order.');
        }

        return Inertia::render('Orders/Track', [
            'order' => $order->load('items')->toDetail(),
            'recent' => [],
        ]);
    }
}
