@extends('emails.layout', ['title' => 'Prescription update', 'eyebrow' => 'Prescription '.$prescription->reference])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:36px;">
        @if($approved)
            Your prescription is approved, {{ strtok($prescription->name, ' ') }}.
        @else
            We couldn't approve your prescription.
        @endif
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">
        @if($approved)
            Any order waiting on it is now confirmed and will be packed shortly.
        @else
            Any order waiting on it has been cancelled and you have not been charged. Please upload a clear, valid prescription or call us — we're happy to help.
        @endif
    </p>
    @if($prescription->review_note)
        <div style="background:#f3f0e8;border-radius:14px;padding:18px 20px;font-size:14px;line-height:22px;white-space:pre-line;"><strong>Pharmacist note:</strong> {{ $prescription->review_note }}</div>
    @endif
@endsection
