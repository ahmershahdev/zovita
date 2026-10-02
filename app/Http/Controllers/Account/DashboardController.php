<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\RefillReminder;
use App\Services\Personalization\Refills;
use App\Services\Security\TwoFactor;
use App\Support\UserAgent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, Refills $refills, TwoFactor $twoFactor): Response
    {
        $user = $request->user();

        return Inertia::render('Account/Dashboard', [
            'profile' => $user->only('name', 'username', 'email', 'phone', 'city', 'address', 'lat', 'lng') + [
                'avatar' => $user->avatarUrl(),
                'member_since' => $user->created_at->toIso8601String(),
                'email_verified' => $user->hasVerifiedEmail(),
            ],
            // Recent sign-ins, so customers can spot access they don't recognise.
            'signins' => $user->activities()->whereIn('type', ['auth.login', 'auth.failed'])->latest('created_at')->limit(6)->get()
                ->map(fn ($a) => [
                    'type' => $a->type,
                    'at' => $a->created_at->toIso8601String(),
                    'ip' => $a->ip,
                    'browser' => UserAgent::describe($a->user_agent),
                ]),
            'store' => config('zovita.store'),
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
            'refills' => [
                'enabled' => (bool) $user->refill_reminders,
                'items' => $refills->upcoming($user)->map(fn (RefillReminder $r) => $refills->toClient($r))->values(),
            ],
            'twoFactor' => TwoFactorController::props($request, $twoFactor),
            'tab' => $request->session()->get('tab'),
        ]);
    }
}
