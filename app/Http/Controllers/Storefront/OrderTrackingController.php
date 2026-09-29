<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderTrackingController extends Controller
{
    /** Looking up an order requires both the number and the email it was placed with. */
    public function __invoke(Request $request): Response
    {
        $number = strtoupper(trim($request->query->getString('number')));
        $email = strtolower(trim($request->query->getString('email')));

        $order = null;
        $searched = $number !== '' && $email !== '';
        if ($searched) {
            $order = Order::with('items')->where('number', $number)->where('email', $email)->first();
        }

        return Inertia::render('Orders/Track', [
            'query' => ['number' => $number, 'email' => $email],
            'order' => $order?->toDetail(),
            'notFound' => $searched && ! $order,
        ]);
    }
}
