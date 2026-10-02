@extends('emails.layout', [
    'title' => 'Time to refill',
    'eyebrow' => 'Refill reminder',
    'preheader' => 'Your regular medicines are running low — reorder in one tap.',
])

@section('content')
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:34px;line-height:40px;">
        Running low, {{ strtok($user->name, ' ') }}?
    </h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#374151;">
        Going by how often you usually order, these will run out soon. Tap one to put it back in your bag; nothing is ordered until you check out.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        @foreach($items as $item)
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0ece2;width:56px;">
                    @if($item['image'])<img src="{{ $item['image'] }}" width="48" height="48" alt="" style="border-radius:10px;background:#f3f0e8;object-fit:contain;display:block;">@endif
                </td>
                <td style="padding:12px 12px;border-bottom:1px solid #f0ece2;font-size:14px;line-height:20px;">
                    {{ $item['name'] }}<br>
                    <span style="color:#6b7280;font-size:12px;">You order it about every {{ $item['interval'] }} days · due {{ $item['due']->timezone('Asia/Karachi')->format('j M') }}</span>
                </td>
                <td align="right" style="padding:12px 0;border-bottom:1px solid #f0ece2;font-size:14px;white-space:nowrap;">
                    <a href="{{ $item['url'] }}" style="color:#0f766e;font-weight:600;text-decoration:none;">Reorder &rarr;</a>
                </td>
            </tr>
        @endforeach
    </table>

    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b7280;">
        Medicines that need a prescription still need a valid one at checkout. Don't want these reminders?
        <a href="{{ $settingsUrl }}" style="color:#6b7280;">Turn them off in your account</a>.
    </p>
@endsection
