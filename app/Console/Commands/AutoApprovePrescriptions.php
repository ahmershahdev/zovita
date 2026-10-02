<?php

namespace App\Console\Commands;

use App\Actions\Prescriptions\ReviewPrescription;
use Illuminate\Console\Command;

/** Scheduled every ten minutes (routes/console.php). */
class AutoApprovePrescriptions extends Command
{
    protected $signature = 'prescriptions:auto-approve';

    protected $description = 'Approve prescriptions with no pharmacist decision after 24 hours';

    public function handle(ReviewPrescription $review): int
    {
        $count = $review->autoApproveOverdue();
        $this->components->info("{$count} prescription(s) approved automatically.");

        return self::SUCCESS;
    }
}
