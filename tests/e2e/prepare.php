<?php

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;

/**
 * Playwright global setup (see playwright.config.js): gives the seeded owner account a known
 * two-step secret, so browser tests can sign in to the admin panel by computing the same codes an
 * authenticator app would. Refuses to run in production.
 */
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (app()->isProduction()) {
    fwrite(STDERR, "Refusing to touch staff accounts in production.\n");
    exit(1);
}

$email = getenv('E2E_ADMIN_EMAIL') ?: 'admin@zovita.com';
$secret = getenv('E2E_TOTP_SECRET') ?: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
$user = User::where('email', $email)->first();
if (! $user) {
    fwrite(STDERR, "No {$email} account. Run php artisan migrate --seed first.\n");
    exit(1);
}
$user->setStaffRole(StaffRole::Owner);
$user->forceFill([
    'two_factor_secret' => $secret,
    'two_factor_recovery_codes' => [],
    'two_factor_confirmed_at' => now(),
    'two_factor_last_step' => null,
])->save();
fwrite(STDOUT, "E2E: {$email} uses the test two-step secret.\n");
