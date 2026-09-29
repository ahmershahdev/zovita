@extends('emails.layout', ['title' => 'Welcome to Zovita', 'eyebrow' => 'Welcome', 'preheader' => 'Your account is ready.'])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:40px;">
        Welcome, {{ strtok($user->name, ' ') }}. Care just got simpler.
    </h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#374151;">
        Your Zovita account is ready. Here is what you can do with it:
    </p>
    <ul style="margin:0 0 8px;padding-left:18px;font-size:15px;line-height:26px;color:#374151;">
        <li>Order from 475+ authentic medicines, syrups and supplements</li>
        <li>Upload a prescription and let our pharmacists do the rest</li>
        <li>Track every order and re-order in a couple of taps</li>
    </ul>
    @include('emails.partials.button', ['url' => route('shop.index'), 'label' => 'Start shopping'])
@endsection
