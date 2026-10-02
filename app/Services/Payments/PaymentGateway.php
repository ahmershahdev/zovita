<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;

interface PaymentGateway
{
    public function name(): string;

    /**
     * Creates a hosted checkout for the payment.
     *
     * @return array{reference: string, url: string}
     */
    public function createCheckout(Payment $payment, Order $order): array;

    /**
     * Refunds part or all of a captured payment.
     *
     * @return array{reference: string, status: string}
     */
    public function refund(Payment $payment, float $amount): array;

    /** The secret the gateway signs its webhooks with. */
    public function webhookSecret(): string;
}
