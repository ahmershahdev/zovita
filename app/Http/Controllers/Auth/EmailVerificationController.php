<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\ActivityLog;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * E-mail confirmation. The link is signed (it can't be edited), carries a hash of the address it
 * was sent to (changing the e-mail kills old links) and expires after 10 minutes.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = User::find($id);
        abort_unless($user && hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
            ActivityLog::record('account.verified', 'Confirmed their e-mail address', $user);
        }

        return redirect($request->user()?->is($user) ? route('account.dashboard') : route('login'))
            ->with('success', __('Thanks — your e-mail address is confirmed.'));
    }

    public function send(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return back();
        }
        $request->user()->sendEmailVerificationNotification();

        return back()->with('success', __('We sent a new confirmation link. It expires in 10 minutes.'));
    }
}
