<?php

namespace App\Actions\Prescriptions;

use App\Enums\OrderStatus;
use App\Enums\PrescriptionStatus;
use App\Mail\PrescriptionDecisionMail;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Mail\TransactionalMailer;
use Illuminate\Support\Facades\DB;

/**
 * Pharmacist decision on a prescription (or the automatic approval after 24 hours). The row is
 * locked so two reviewers — or a reviewer and the scheduler — can't both decide it.
 * Approving confirms the waiting order; rejecting cancels it and puts the stock back.
 */
class ReviewPrescription
{
    public function __construct(private readonly TransactionalMailer $mailer) {}

    public function handle(Prescription $prescription, PrescriptionStatus $status, ?User $reviewer = null, ?string $note = null, bool $automatic = false): bool
    {
        $changed = DB::transaction(function () use ($prescription, $status, $reviewer, $note, $automatic) {
            $locked = Prescription::whereKey($prescription->id)->lockForUpdate()->first();
            if (! $locked || ($automatic && ! $locked->isPending())) {
                return false;
            }

            $locked->update([
                'status' => $status,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => now(),
                'review_note' => $note,
                'auto_approved' => $automatic,
            ]);

            foreach (Order::where('prescription_id', $locked->id)->where('status', OrderStatus::Pending)->lockForUpdate()->get() as $order) {
                if ($status === PrescriptionStatus::Approved) {
                    $order->update(['status' => OrderStatus::Confirmed]);
                } elseif ($status === PrescriptionStatus::Rejected) {
                    foreach ($order->items as $item) {
                        if ($item->product_id) {
                            DB::table('products')->where('id', $item->product_id)->increment('stock', $item->quantity);
                        }
                    }
                    $order->update(['status' => OrderStatus::Cancelled]);
                }
            }
            $prescription->setRawAttributes($locked->getAttributes(), true);

            return true;
        });

        if ($changed && in_array($status, [PrescriptionStatus::Approved, PrescriptionStatus::Rejected], true)) {
            $this->mailer->send($prescription->email, new PrescriptionDecisionMail($prescription->fresh()));
        }

        return $changed;
    }

    /** Approve everything still undecided after the 24-hour window. Returns how many. */
    public function autoApproveOverdue(): int
    {
        $count = 0;
        Prescription::whereIn('status', [PrescriptionStatus::Received, PrescriptionStatus::Reviewing])
            ->where('created_at', '<=', now()->subHours(Prescription::AUTO_APPROVE_HOURS))
            ->orderBy('id')
            ->each(function (Prescription $p) use (&$count) {
                if ($this->handle($p, PrescriptionStatus::Approved, note: 'Approved automatically after 24 hours without a pharmacist decision.', automatic: true)) {
                    $count++;
                }
            });

        return $count;
    }
}
