<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\Payments\PaymentService;
use Illuminate\Console\Command;

class ExpireUnpaidOrders extends Command
{
    protected $signature = 'payments:expire';

    protected $description = 'Cancel card orders whose payment window passed, and put their stock back';

    public function handle(PaymentService $payments): int
    {
        $count = 0;
        Order::where('status', OrderStatus::AwaitingPayment)
            ->where('payment_status', 'pending')
            ->where('payment_expires_at', '<=', now())
            ->orderBy('id')
            ->each(function (Order $order) use ($payments, &$count) {
                $count += (int) $payments->expire($order);
            });

        $this->components->info("Expired {$count} unpaid card ".str('order')->plural($count).'.');

        return self::SUCCESS;
    }
}
