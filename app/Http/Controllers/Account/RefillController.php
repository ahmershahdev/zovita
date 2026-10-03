<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Models\RefillReminder;
use App\Services\Cart\CartService;
use App\Services\Personalization\Refills;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RefillController extends Controller
{
    /** One tap from the e-mail (signed link) or the account page: back in the bag. */
    public function reorder(Request $request, RefillReminder $reminder, CartService $cart, Refills $refills): RedirectResponse
    {
        // Signed links work without signing in; the account button checks ownership instead.
        if (! $request->hasValidSignature()) {
            abort_unless($request->user()?->id === $reminder->user_id, 404);
        }
        $product = $reminder->product;
        if (! $product || $product->stock < 1) {
            return to_route('cart.index')->with('error', __('That medicine is out of stock right now.'));
        }
        $cart->add($product, $refills->lastQuantity($reminder));

        return to_route('cart.index')->with('success', __(':name is back in your bag.', ['name' => $product->name]));
    }

    public function dismiss(Request $request, RefillReminder $reminder): RedirectResponse
    {
        abort_unless($request->user()->id === $reminder->user_id, 404);
        $reminder->update(['dismissed_at' => now()]);

        return back()->with('success', __('Hidden until your next purchase of it.'));
    }

    public function preferences(Request $request): RedirectResponse
    {
        $data = $request->validate(['refill_reminders' => ['required', 'boolean']]);
        $request->user()->forceFill(['refill_reminders' => $data['refill_reminders']])->save();

        return back()->with('success', $data['refill_reminders'] ? __('Refill reminders are on.') : __('Refill reminders are off.'));
    }
}
