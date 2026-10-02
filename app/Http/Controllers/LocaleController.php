<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\Rule;

/** Language switch: remembered in a cookie, and on the account when signed in. */
class LocaleController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $data = $request->validate(['locale' => ['required', Rule::in(array_keys(SetLocale::LOCALES))]]);
        $request->user()?->forceFill(['locale' => $data['locale']])->saveQuietly();
        Cookie::queue(Cookie::make(SetLocale::COOKIE, $data['locale'], 60 * 24 * 365, httpOnly: false, sameSite: 'lax'));

        // Return to the same page, minus any ?lang= (it would override the choice just made).
        $previous = url()->previous(route('home'));
        $parts = parse_url($previous);
        parse_str($parts['query'] ?? '', $query);
        unset($query['lang']);
        $target = strtok($previous, '?').($query ? '?'.http_build_query($query) : '');

        return redirect()->to(str_starts_with($target, url('/')) ? $target : route('home'));
    }
}
