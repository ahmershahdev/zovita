<?php

namespace App\Http\Controllers;

use App\Services\Payments\InvalidWebhook;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Gateway → us. No session or CSRF; trusted only through the signature PaymentService checks. */
class WebhookController extends Controller
{
    public function __invoke(Request $request, PaymentService $payments, string $provider): JsonResponse
    {
        abort_unless(in_array($provider, ['stripe', 'sandbox'], true), 404);

        try {
            $result = $payments->handleWebhook($provider, $request->getContent(), $request->header('Stripe-Signature'));
        } catch (InvalidWebhook $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        return response()->json(['received' => true, 'result' => $result]);
    }
}
