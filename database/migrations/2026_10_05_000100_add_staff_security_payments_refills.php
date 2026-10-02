<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Staff roles + two-factor sign-in, online payments (payments, refunds, webhook log), refill
 * reminders, drug-interaction snapshots on orders, sticky A/B assignments and upload scanning.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // null = customer; owner / pharmacist / support = staff (see App\Enums\StaffRole).
            $table->string('role', 20)->nullable()->after('is_admin')->index();
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            // Last accepted TOTP time-step: a code can't be replayed inside its 30-second window.
            $table->unsignedBigInteger('two_factor_last_step')->nullable()->after('two_factor_confirmed_at');
            $table->boolean('refill_reminders')->default(true)->after('locale');
        });
        DB::table('users')->where('is_admin', true)->update(['role' => 'owner']);

        Schema::table('orders', function (Blueprint $table) {
            // cod orders stay "unpaid" until delivery; card orders move pending → paid (→ refunded).
            $table->string('payment_status', 20)->default('unpaid')->after('payment_method')->index();
            $table->timestamp('paid_at')->nullable()->after('payment_status');
            $table->timestamp('payment_expires_at')->nullable()->after('paid_at')->index();
            $table->decimal('refunded_amount', 10, 2)->default(0)->after('total');
            $table->json('interaction_warnings')->nullable()->after('notes');
            // Who placed it (u:id / g:uuid), so a payment webhook can credit personalisation and A/B.
            $table->string('visitor', 64)->nullable()->after('user_id');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20);
            // Gateway's checkout/session id; unique so one session can only ever settle one payment.
            $table->string('reference', 120)->nullable()->unique();
            $table->string('intent', 120)->nullable()->index();
            $table->string('status', 20)->default('pending')->index();
            $table->decimal('amount', 10, 2);
            $table->decimal('refunded_amount', 10, 2)->default(0);
            $table->string('currency', 3)->default('PKR');
            $table->text('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference', 120)->nullable()->unique();
            $table->decimal('amount', 10, 2);
            $table->string('status', 20)->default('succeeded');
            $table->string('reason', 255)->nullable();
            $table->timestamps();
        });

        // Webhook de-duplication: gateways retry, so every event id is processed at most once.
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 20);
            $table->string('event_id', 120);
            $table->string('type', 80);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'event_id']);
        });

        Schema::create('refill_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->dateTime('last_purchased_at');
            $table->dateTime('due_at')->index();
            $table->unsignedSmallInteger('interval_days');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();
            // One reminder per purchase cycle: re-running the scheduler can never e-mail twice.
            $table->unique(['user_id', 'product_id', 'last_purchased_at']);
        });

        Schema::create('experiment_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('visitor', 64);
            $table->string('experiment', 40);
            $table->string('variant', 20);
            $table->timestamp('created_at')->nullable();
            $table->unique(['visitor', 'experiment']);
        });

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->string('scan_status', 20)->nullable()->after('original_name');
        });
    }

    public function down(): void
    {
        Schema::table('prescriptions', fn (Blueprint $table) => $table->dropColumn('scan_status'));
        Schema::dropIfExists('experiment_assignments');
        Schema::dropIfExists('refill_reminders');
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('payments');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['payment_expires_at']);
            $table->dropColumn(['payment_status', 'paid_at', 'payment_expires_at', 'refunded_amount', 'interaction_warnings', 'visitor']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn(['role', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'two_factor_last_step', 'refill_reminders']);
        });
    }
};
