@extends('emails.layout', ['title' => 'Prescription', 'eyebrow' => 'Prescription '.$prescription->reference])

@section('content')
    @if($forTeam)
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:36px;">New prescription to review</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#374151;">
            {{ $prescription->name }} · {{ $prescription->email }} · {{ $prescription->phone }}<br>
            File: {{ $prescription->original_name }} (attached)
        </p>
    @else
        <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:36px;">
            We've got your prescription, {{ strtok($prescription->name, ' ') }}.
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">
            A licensed pharmacist will review it and call you on {{ $prescription->phone }} to confirm medicines, quantities and price
            before anything is dispatched. Your reference is <strong>{{ $prescription->reference }}</strong>.
        </p>
    @endif
    @if($prescription->notes)
        <div style="background:#f3f0e8;border-radius:14px;padding:18px 20px;font-size:14px;line-height:22px;white-space:pre-line;">{{ $prescription->notes }}</div>
    @endif
@endsection
