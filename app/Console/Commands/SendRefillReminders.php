<?php

namespace App\Console\Commands;

use App\Mail\RefillReminderMail;
use App\Models\User;
use App\Services\Mail\TransactionalMailer;
use App\Services\Personalization\Refills;
use Illuminate\Console\Command;

class SendRefillReminders extends Command
{
    protected $signature = 'refills:remind';

    protected $description = 'E-mail customers whose regular medicines are about to run out (once per purchase cycle)';

    public function handle(Refills $refills, TransactionalMailer $mailer): int
    {
        $sent = 0;
        User::where('refill_reminders', true)
            ->whereNull('banned_at')
            ->whereExists(fn ($q) => $q->selectRaw('1')->from('product_interactions')
                ->whereColumn('product_interactions.user_id', 'users.id')->where('purchases', '>=', 2))
            ->orderBy('id')
            ->each(function (User $user) use ($refills, $mailer, &$sent) {
                $due = $refills->claimDue($user);
                if ($due->isNotEmpty() && $mailer->send($user->email, new RefillReminderMail($user, $due))) {
                    $sent++;
                }
            });

        $this->components->info("Sent {$sent} refill ".str('reminder')->plural($sent).'.');

        return self::SUCCESS;
    }
}
