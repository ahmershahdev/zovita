@extends('emails.layout', ['title' => 'Subscribed', 'eyebrow' => 'Wellness notes'])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:32px;line-height:38px;">You're on the list.</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#374151;">
        Expect one short, useful email a month: seasonal care guides, pharmacist tips, and first access to offers. No spam, ever.
    </p>
    @include('emails.partials.button', ['url' => route('shop.index'), 'label' => 'Browse the pharmacy'])
@endsection
