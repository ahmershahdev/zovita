<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Prescriptions\ReviewPrescription;
use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Prescription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PrescriptionController extends Controller
{
    public const TABS = ['pending', 'approved', 'rejected', 'all'];

    public function index(Request $request, ReviewPrescription $review): Response
    {
        // Cron-less fallback: anything past its 24h window is approved before the list is shown.
        $review->autoApproveOverdue();
        $tab = in_array($request->query('status'), self::TABS, true) ? $request->query('status') : 'pending';
        $pending = [PrescriptionStatus::Received, PrescriptionStatus::Reviewing];

        $items = Prescription::with('reviewer:id,name')
            ->withCount('orders')
            ->when($tab === 'pending', fn ($q) => $q->whereIn('status', $pending)->oldest())
            ->when($tab === 'approved', fn ($q) => $q->where('status', PrescriptionStatus::Approved)->latest('reviewed_at'))
            ->when($tab === 'rejected', fn ($q) => $q->where('status', PrescriptionStatus::Rejected)->latest('reviewed_at'))
            ->when($tab === 'all', fn ($q) => $q->latest())
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Prescription $p) => [
                'id' => $p->id,
                'reference' => $p->reference,
                'name' => $p->name,
                'email' => $p->email,
                'phone' => $p->phone,
                'notes' => $p->notes,
                'original_name' => $p->original_name,
                'is_pdf' => str_ends_with(strtolower($p->file_path), '.pdf'),
                'status' => $p->status->value,
                'status_label' => $p->status->label(),
                'orders' => $p->orders_count,
                'submitted_at' => $p->created_at->toIso8601String(),
                'auto_decision_at' => $p->autoDecisionAt()?->toIso8601String(),
                'reviewed_at' => $p->reviewed_at?->toIso8601String(),
                'reviewer' => $p->reviewer?->name,
                'review_note' => $p->review_note,
                'auto_approved' => $p->auto_approved,
                'file_url' => route('admin.prescriptions.file', $p),
            ]);

        $counts = Prescription::selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('Admin/Prescriptions', [
            'prescriptions' => $items,
            'tab' => $tab,
            'counts' => [
                'pending' => (int) (($counts['received'] ?? 0) + ($counts['reviewing'] ?? 0)),
                'approved' => (int) ($counts['approved'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
            ],
            'autoHours' => Prescription::AUTO_APPROVE_HOURS,
        ]);
    }

    public function update(Request $request, Prescription $prescription, ReviewPrescription $review): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'reviewing', 'received'])],
            'note' => ['nullable', 'string', 'max:500', Rule::requiredIf($request->input('status') === 'rejected')],
        ]);
        $status = PrescriptionStatus::from($data['status']);

        $review->handle($prescription, $status, $request->user(), isset($data['note']) ? strip_tags($data['note']) : null);

        return back()->with('success', "Prescription {$prescription->reference}: {$status->label()}.");
    }

    /** Streams the private file to admins only; it never has a public URL. */
    public function file(Prescription $prescription): StreamedResponse
    {
        $disk = Storage::disk(config('zovita.prescriptions.disk'));
        abort_unless($disk->exists($prescription->file_path), 404);
        $name = preg_replace('/[^A-Za-z0-9._ -]/', '_', $prescription->original_name);

        return $disk->response($prescription->file_path, $name, [
            'Content-Disposition' => 'inline; filename="'.$name.'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
            // Even a malicious upload can't run script when opened.
            'Content-Security-Policy' => "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        ]);
    }
}
