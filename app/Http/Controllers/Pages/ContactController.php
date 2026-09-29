<?php

namespace App\Http\Controllers\Pages;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pages\ContactRequest;
use App\Mail\ContactMessageMail;
use App\Models\ContactMessage;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Http\RedirectResponse;

class ContactController extends Controller
{
    public function __invoke(ContactRequest $request, TransactionalMailer $mailer): RedirectResponse
    {
        $contact = ContactMessage::create($request->safe()->only(['name', 'email', 'phone', 'topic', 'message']) + [
            'ip_address' => $request->ip(),
        ]);

        $mailer->send((string) config('zovita.support_email'), new ContactMessageMail($contact, forTeam: true));
        $mailer->send($contact->email, new ContactMessageMail($contact));

        return back()->with('success', 'Message sent. Our care team will reply within one business day.');
    }
}
