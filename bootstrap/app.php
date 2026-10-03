<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureNotBanned;
use App\Http\Middleware\EnsureStaffCan;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\KeepFlashForBackgroundRequests;
use App\Http\Middleware\RequestGuard;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind a load balancer / CDN: trust its forwarded headers (TRUSTED_PROXIES="*" or a CIDR list).
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : explode(',', $proxies));
        }

        // Abuse checks run first, before sessions or the database are touched.
        $middleware->prepend(RequestGuard::class);

        $middleware->web(append: [
            'throttle:storefront',
            EnsureNotBanned::class,
            SetLocale::class,
            HandleInertiaRequests::class,
            SecurityHeaders::class,
            KeepFlashForBackgroundRequests::class,
        ]);

        $middleware->alias(['admin' => EnsureAdmin::class, 'staff' => EnsureStaffCan::class]);
        // Payment gateways post webhooks without a session; they are verified by signature instead.
        $middleware->validateCsrfTokens(except: ['webhooks/*']);
        $middleware->encryptCookies(except: [SetLocale::COOKIE]);

        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn () => route('account.dashboard'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Branded Inertia error pages. Locally, server errors (500) keep the debug screen.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();

            $branded = [400, 403, 404, 405, 413, 414, 429, 503];
            if (! config('app.debug')) {
                $branded[] = 500;
            }
            if (in_array($status, $branded, true) && ! $request->expectsJson()) {
                return Inertia::render('Errors/Error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            if ($status === 419) {
                return back()->with('error', __('Your session expired. Please try again.'));
            }

            return $response;
        });
    })->create();
