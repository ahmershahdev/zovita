<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Account/Dashboard', [
            'profile' => $user->only('name', 'email', 'phone', 'city', 'address'),
            'cities' => config('zovita.cities'),
            'orders' => $user->orders()->withSum('items as items_count', 'quantity')->latest()->limit(20)->get()
                ->map(fn (Order $order) => $order->toSummary()),
            'prescriptions' => $user->prescriptions()->latest()->limit(10)->get()
                ->map(fn (Prescription $p) => [
                    'reference' => $p->reference,
                    'status' => $p->status->label(),
                    'file' => $p->original_name,
                    'submitted_at' => $p->created_at->toIso8601String(),
                ]),
            'stats' => [
                'orders' => $user->orders()->count(),
                'spent' => (float) $user->orders()->where('status', '!=', 'cancelled')->sum('total'),
                'wishlist' => $user->wishlist()->count(),
            ],
        ]);
    }
}
