@extends('emails.layout', ['title' => 'Reset password', 'eyebrow' => 'Account security', 'preheader' => 'Reset link inside — expires in '.$minutes.' minutes.'])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:32px;line-height:38px;">Reset your password</h1>
    <p style="margin:0;font-size:15px;line-height:24px;color:#374151;">
        Hi {{ strtok($name, ' ') }}, we received a request to reset your Zovita password. The link below expires in {{ $minutes }} minutes.
    </p>
    @include('emails.partials.button', ['url' => $url, 'label' => 'Choose a new password'])
    <p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
@endsection
