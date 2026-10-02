<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console routes & schedule
|--------------------------------------------------------------------------
| Catalog commands live in app/Console/Commands (catalog:import, catalog:cache-images).
| Run the scheduler with `php artisan schedule:work` (dev) or a cron entry calling
| `php artisan schedule:run` every minute (production).
*/

// Prescriptions undecided for 24 hours are approved so customers are never left waiting.
Schedule::command('prescriptions:auto-approve')->everyTenMinutes()->withoutOverlapping();
