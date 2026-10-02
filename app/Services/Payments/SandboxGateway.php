<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * A stand-in for a real card gateway, for local development, demos and tests. Its "hosted page"
 * (/payments/sandbox/{payment}) lets you pay or decline, and then delivers a webhook signed with
 * the same scheme Stripe uses, through the same verification and processing code. Refused in
 * production (see PaymentService::gateway()).
 */
class SandboxGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'sandbox';
    }

    public function createCheckout(Payment $payment, Order $order): array
    {
        return ['reference' => 'sbx_cs_'.Str::random(24), 'url' => route('payments.sandbox.show', $payment)];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['reference' => 'sbx_re_'.Str::random(24), 'status' => 'succeeded'];
    }

    public function webhookSecret(): string
    {
        return (string) config('payments.sandbox.webhook_secret');
    }

    /** Builds the Stripe-Signature header for a payload (used by the sandbox page and tests). */
    public static function sign(string $payload, string $secret, ?int $timestamp = null): string
    {
        $timestamp ??= now()->getTimestamp();

        return 't='.$timestamp.',v1='.hash_hmac('sha256', $timestamp.'.'.$payload, $secret);
    }
}
