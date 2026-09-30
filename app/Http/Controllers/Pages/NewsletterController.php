<?php

namespace App\Http\Controllers\Pages;

use App\Http\Controllers\Controller;
use App\Mail\NewsletterWelcomeMail;
use App\Models\NewsletterSubscriber;
use App\Rules\Recaptcha;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    public function __invoke(Request $request, TransactionalMailer $mailer): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:120'],
            'recaptcha_token' => [Recaptcha::v3('newsletter')],
        ]);

        $subscriber = NewsletterSubscriber::createOrFirst(['email' => strtolower($data['email'])]); // race-safe on the unique index
        if ($subscriber->wasRecentlyCreated) {
            $mailer->send($subscriber->email, new NewsletterWelcomeMail);
        }

        // Same response either way, so the form can't be used to probe who is subscribed.
        return back()->with('success', 'Thanks — check your inbox for a welcome note.');
    }
}
