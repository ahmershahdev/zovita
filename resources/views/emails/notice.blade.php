@extends('emails.layout', ['title' => $heading, 'eyebrow' => $eyebrow, 'preheader' => $code ? 'Your code: '.$code : ($lines[0] ?? $heading)])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:40px;">{{ $heading }}</h1>
    @foreach($lines as $i => $line)
        @if($i === 1 && $code)
            <p style="margin:8px 0 24px;font-family:'Courier New',monospace;font-size:38px;letter-spacing:10px;font-weight:700;color:#0b1b33;">{{ $code }}</p>
        @endif
        <p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#374151;">{{ $line }}</p>
    @endforeach
    @if($code && count($lines) < 2)
        <p style="margin:8px 0 24px;font-family:'Courier New',monospace;font-size:38px;letter-spacing:10px;font-weight:700;color:#0b1b33;">{{ $code }}</p>
    @endif
    @if($buttonUrl)
        @include('emails.partials.button', ['url' => $buttonUrl, 'label' => $buttonLabel ?? 'Open Zovita'])
    @endif
@endsection
