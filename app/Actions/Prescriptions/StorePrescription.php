<?php

namespace App\Actions\Prescriptions;

use App\Enums\PrescriptionStatus;
use App\Mail\PrescriptionMail;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class StorePrescription
{
    public function __construct(private readonly TransactionalMailer $mailer) {}

    /**
     * @param  array{name: string, email: string, phone: string, notes?: ?string}  $contact
     */
    public function handle(UploadedFile $file, array $contact, ?User $user = null, bool $notify = true): Prescription
    {
        $config = config('zovita.prescriptions');

        // Random, non-guessable filename on the private disk — never web-accessible.
        $path = $file->storeAs(
            $config['directory'],
            Str::uuid().'.'.$file->extension(),
            $config['disk'],
        );

        $prescription = Prescription::create([
            'user_id' => $user?->id,
            'reference' => Prescription::generateReference(),
            'name' => $contact['name'],
            'email' => $contact['email'],
            'phone' => $contact['phone'],
            'notes' => $contact['notes'] ?? null,
            'file_path' => $path,
            'original_name' => Str::limit($file->getClientOriginalName(), 180, ''),
            'status' => PrescriptionStatus::Received,
        ]);

        if ($notify) {
            $this->mailer->send($prescription->email, new PrescriptionMail($prescription));
            $this->mailer->toTeam(new PrescriptionMail($prescription, forTeam: true));
        }

        return $prescription;
    }
}
