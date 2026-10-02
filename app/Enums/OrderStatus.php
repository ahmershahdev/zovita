<?php

namespace App\Enums;

enum OrderStatus: string
{
    case AwaitingPayment = 'awaiting_payment';
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Packed = 'packed';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::AwaitingPayment => 'Awaiting card payment',
            self::Pending => 'Order placed',
            self::Confirmed => 'Confirmed by pharmacist',
            self::Packed => 'Packed',
            self::Shipped => 'Out for delivery',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    /** The happy-path timeline shown on tracking pages. */
    public static function timeline(): array
    {
        return [self::Pending, self::Confirmed, self::Packed, self::Shipped, self::Delivered];
    }
}
