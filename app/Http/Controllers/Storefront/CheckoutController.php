<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\Orders\PlaceOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\Checkout\PlaceOrderRequest;
use App\Models\Order;
use App\Services\Cart\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function create(Request $request, CartService $cart): Response|RedirectResponse
    {
        if ($cart->isEmpty()) {
            return to_route('cart.index')->with('error', 'Your bag is empty.');
        }

        $user = $request->user();

        return Inertia::render('Checkout/Create', [
            'cart' => $cart->summary(),
            'cities' => config('zovita.cities'),
            // Idempotency key for this checkout attempt (see PlaceOrder).
            'checkoutToken' => (string) Str::uuid(),
            'defaults' => [
                'name' => $user?->name ?? '',
                'email' => $user?->email ?? '',
                'phone' => $user?->phone ?? '',
                'city' => $user?->city ?? '',
                'address' => $user?->address ?? '',
            ],
        ]);
    }

    public function store(PlaceOrderRequest $request, PlaceOrder $placeOrder): RedirectResponse
    {
        // Serialise checkouts from the same session (double-clicks, two tabs) before touching stock.
        $order = Cache::lock('checkout:'.$request->session()->getId(), 20)->block(10, fn () => $placeOrder->handle(
            $request->safe()->except(['prescription', 'recaptcha_token', 'checkout_token']),
            $request->user(),
            $request->file('prescription'),
            $request->validated('checkout_token'),
        ));

        // Guests may view their confirmation once, from this session only.
        $request->session()->put('checkout.last_order', $order->number);

        return to_route('checkout.success', $order);
    }

    public function success(Request $request, Order $order): Response
    {
        $ownsOrder = $request->session()->get('checkout.last_order') === $order->number
            || ($order->user_id && $order->user_id === $request->user()?->id);
        abort_unless($ownsOrder, 404);

        return Inertia::render('Checkout/Success', ['order' => $order->load('items')->toDetail()]);
    }
}
