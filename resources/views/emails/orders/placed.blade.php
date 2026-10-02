@extends('emails.layout', [
    'title' => 'Order '.$order->number,
    'eyebrow' => $forTeam ? 'New order' : 'Order confirmed',
    'preheader' => 'Order '.$order->number.' · PKR '.number_format($order->total),
])

@section('content')
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Order {{ $order->number }}</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:40px;">
        @if($forTeam)
            {{ $order->customer_name }} placed an order.
        @else
            Thank you, {{ strtok($order->customer_name, ' ') }}. Your order is in.
        @endif
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#374151;">
        @if($forTeam)
            {{ $order->email }} · {{ $order->phone }} · {{ $order->city }}
            @if($order->prescription_id) · <strong>Prescription attached to order</strong>@endif
        @else
            A pharmacist reviews every order before dispatch. We'll call {{ $order->phone }} if anything needs confirming.
        @endif
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        @foreach($order->items as $item)
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0ece2;width:56px;">
                    @if($item->image)<img src="{{ $item->image }}" width="48" height="48" alt="" style="border-radius:10px;background:#f3f0e8;object-fit:contain;display:block;">@endif
                </td>
                <td style="padding:12px 12px;border-bottom:1px solid #f0ece2;font-size:14px;line-height:20px;">
                    {{ $item->name }}<br><span style="color:#6b7280;font-size:12px;">Qty {{ $item->quantity }} × PKR {{ number_format($item->unit_price, 2) }}</span>
                </td>
                <td align="right" style="padding:12px 0;border-bottom:1px solid #f0ece2;font-size:14px;white-space:nowrap;">PKR {{ number_format($item->line_total, 2) }}</td>
            </tr>
        @endforeach
    </table>

    <table role="presentation" width="100%" style="margin-top:16px;font-size:14px;line-height:26px;">
        <tr><td style="color:#6b7280;">Subtotal</td><td align="right">PKR {{ number_format($order->subtotal, 2) }}</td></tr>
        @if($order->savings > 0)
            <tr><td style="color:#0f766e;">You saved</td><td align="right" style="color:#0f766e;">− PKR {{ number_format($order->savings, 2) }}</td></tr>
        @endif
        <tr><td style="color:#6b7280;">Delivery</td><td align="right">{{ $order->delivery_fee > 0 ? 'PKR '.number_format($order->delivery_fee, 2) : 'Free' }}</td></tr>
        <tr><td style="font-weight:700;font-size:16px;padding-top:6px;">Total ({{ $order->payment_method === 'card' ? 'paid by card' : 'cash on delivery' }})</td><td align="right" style="font-weight:700;font-size:16px;padding-top:6px;">PKR {{ number_format($order->total, 2) }}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b7280;">
        Delivering to: {{ $order->address }}, {{ $order->city }}
    </p>

    @include('emails.partials.button', [
        'url' => route('orders.track', ['number' => $order->number, 'email' => $order->email]),
        'label' => 'Track your order',
    ])
@endsection
