<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\Experiments\Experiments;
use App\Services\Personalization\Interactions;
use App\Services\Personalization\OfferEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lightweight behaviour beacons from the storefront: time spent on a product page (sent when the
 * visitor leaves it) and A/B experiment events. Validated, throttled and write-only.
 */
class SignalController extends Controller
{
    public function dwell(Request $request, Interactions $interactions, OfferEngine $offers): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'seconds' => ['required', 'integer', 'min:1', 'max:'.Interactions::MAX_DWELL],
        ]);

        $interactions->dwell((int) $data['product_id'], (int) $data['seconds']);
        $offers->evaluate();

        return response()->json(['ok' => true]);
    }

    public function experiment(Request $request, Experiments $experiments): JsonResponse
    {
        $data = $request->validate([
            'experiment' => ['required', 'string', 'max:40'],
            'event' => ['required', 'string', 'in:'.implode(',', Experiments::EVENTS)],
        ]);

        $experiments->track($data['experiment'], $data['event']);

        return response()->json(['ok' => true]);
    }
}
