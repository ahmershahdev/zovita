<?php

namespace App\Services\Mail;

use App\Enums\OrderStatus;
use App\Mail\NoticeMail;
use App\Models\Order;
use App\Models\User;
use App\Models\UserActivity;
use App\Support\UserAgent;

/**
 * Automatic customer e-mails that aren't tied to one form: a sign-in from a new device/network,
 * each order status change, and refunds. All use the branded NoticeMail template.
 */
class AccountNotices
{
    public function __construct(private readonly TransactionalMailer $mailer) {}

    /** "New sign-in" alert, only when this IP hasn't signed in to the account in the last 90 days. */
    public function signIn(User $user): void
    {
        $ip = request()->ip();
        $seen = UserActivity::where('user_id', $user->id)->where('type', 'auth.login')
            ->where('ip', $ip)->where('created_at', '>=', now()->subDays(90))
            ->where('created_at', '<', now()->subSeconds(5))->exists();
        $first = ! UserActivity::where('user_id', $user->id)->where('type', 'auth.login')->where('created_at', '<', now()->subSeconds(5))->exists();
        if ($seen || $first) {
            return; // known place, or the very first sign-in (they just made the account)
        }

        $this->mailer->send($user->email, new NoticeMail(
            title: 'New sign-in to your Zovita account',
            eyebrow: 'Security alert',
            heading: 'Was this you?',
            lines: [
                'Your account was just signed in from '.UserAgent::describe(request()->userAgent()).' (IP '.$ip.') at '.now()->timezone('Asia/Karachi')->format('j M Y, g:i A').' PKT.',
                'If this was you, there’s nothing to do. If not, reset your password now and turn on two-step sign-in in Account → Security.',
            ],
            buttonUrl: route('password.request'),
            buttonLabel: 'Reset my password',
            labels: ['security'],
        ));
    }

    public function orderStatus(Order $order): void
    {
        $text = match ($order->status) {
            OrderStatus::Confirmed => 'Our pharmacist has checked your order and it’s being prepared.',
            OrderStatus::Packed => 'Your order is packed and waiting for the rider.',
            OrderStatus::Shipped => 'Your order is out for delivery. Please keep your phone nearby'.($order->payment_method === 'cod' ? ' and PKR '.number_format($order->total).' ready.' : '.'),
            OrderStatus::Delivered => 'Your order has been delivered. We hope you feel better soon.',
            OrderStatus::Cancelled => 'Your order has been cancelled.'.($order->payment_method === 'card' && $order->paid_at ? ' Any card payment is refunded to the same card.' : ''),
            default => null,
        };
        if (! $text) {
            return;
        }

        $this->mailer->send($order->email, new NoticeMail(
            title: "Order {$order->number}: {$order->status->label()}",
            eyebrow: 'Order update',
            heading: $order->status->label(),
            lines: ['Hi '.strtok($order->customer_name, ' ').'. '.$text, "Order {$order->number} · PKR ".number_format($order->total, 2)],
            buttonUrl: route('orders.track', ['number' => $order->number, 'email' => $order->email]),
            buttonLabel: 'Track your order',
            labels: ['order'],
        ));
    }

    public function refund(Order $order, float $amount): void
    {
        $this->mailer->send($order->email, new NoticeMail(
            title: 'Refund of PKR '.number_format($amount, 2)." for order {$order->number}",
            eyebrow: 'Refund issued',
            heading: 'Your refund is on its way',
            lines: [
                'Hi '.strtok($order->customer_name, ' ').', we’ve refunded PKR '.number_format($amount, 2)." for order {$order->number} to the card you paid with.",
                'Banks usually show it within 5–10 business days.',
            ],
            labels: ['order'],
        ));
    }
}
