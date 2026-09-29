@extends('emails.layout', ['title' => 'Contact', 'eyebrow' => $forTeam ? 'Contact form' : 'Message received'])

@section('content')
    @if($forTeam)
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:36px;">{{ $contact->topic }}</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#6b7280;">
            {{ $contact->name }} · {{ $contact->email }}@if($contact->phone) · {{ $contact->phone }}@endif
        </p>
    @else
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:36px;">
            Thanks, {{ strtok($contact->name, ' ') }}. We're on it.
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">
            Our care team replies within one business day ({{ config('zovita.support_hours') }}). Here is a copy of your message:
        </p>
    @endif
    <div style="background:#f3f0e8;border-radius:14px;padding:18px 20px;font-size:14px;line-height:22px;color:#0b1b33;white-space:pre-line;">{{ $contact->message }}</div>
@endsection
