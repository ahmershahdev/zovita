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

// Card orders not paid within the window: cancelled, restocked, offers released.
Schedule::command('payments:expire')->everyFiveMinutes()->withoutOverlapping();

// Refill reminders for regular medicines, once a day at a civilised hour.
Schedule::command('refills:remind')->dailyAt('09:00')->timezone('Asia/Karachi')->withoutOverlapping();
