<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\Prescriptions\StorePrescription;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\PrescriptionRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PrescriptionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Prescriptions/Create', [
            'limits' => [
                'max_mb' => (int) (config('zovita.prescriptions.max_kb') / 1024),
                'types' => config('zovita.prescriptions.mimes'),
            ],
        ]);
    }

    public function store(PrescriptionRequest $request, StorePrescription $store): RedirectResponse
    {
        $prescription = $store->handle(
            $request->file('file'),
            $request->safe()->only(['name', 'email', 'phone', 'notes']),
            $request->user(),
        );

        return back()->with('success', "Prescription {$prescription->reference} received. A pharmacist will call you shortly.");
    }
}
