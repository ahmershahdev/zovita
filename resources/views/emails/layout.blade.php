<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ $title ?? config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background:#f3f0e8;font-family:'Helvetica Neue',Arial,sans-serif;color:#0b1b33;">
@if(!empty($preheader))
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{ $preheader }}</div>
@endif
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0e8;padding:32px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">
                <tr>
                    <td style="background:#0b1b33;padding:28px 36px;">
                        <table role="presentation" width="100%"><tr>
                            <td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#f3f0e8;letter-spacing:-0.5px;">Zovita<span style="color:#9ef0c2;">+</span></td>
                            <td align="right" style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9ef0c2;">{{ $eyebrow ?? 'Care, delivered' }}</td>
                        </tr></table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:40px 36px 12px;">
                        @yield('content')
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px 36px 36px;">
                        <table role="presentation" width="100%" style="border-top:1px solid #e7e2d6;padding-top:20px;">
                            <tr><td style="font-size:12px;line-height:20px;color:#6b7280;padding-top:20px;">
                                Questions? Reply to this email or reach us at
                                <a href="mailto:{{ config('zovita.support_email') }}" style="color:#0b1b33;">{{ config('zovita.support_email') }}</a>
                                · {{ config('zovita.support_phone') }}<br>
                                Zovita Health · <a href="{{ url('/') }}" style="color:#0b1b33;">{{ parse_url(config('app.url'), PHP_URL_HOST) }}</a>
                            </td></tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
