<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Personalisation, automatic offers, admin moderation and A/B testing.
 *
 * A "visitor" is `u:{user id}` for signed-in customers and `g:{uuid}` (long-lived cookie) for
 * guests; guest rows are re-keyed to the account on sign-in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->index()->after('password');
            $table->timestamp('banned_at')->nullable()->index()->after('is_admin');
            $table->string('ban_reason', 255)->nullable()->after('banned_at');
            $table->string('locale', 5)->nullable()->after('ban_reason');
            $table->timestamp('last_seen_at')->nullable()->after('locale');
        });

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->foreignId('reviewed_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            $table->text('review_note')->nullable()->after('reviewed_at');
            $table->boolean('auto_approved')->default(false)->after('review_note');
            $table->index(['status', 'created_at']);
        });

        Schema::create('product_interactions', function (Blueprint $table) {
            $table->id();
            $table->string('visitor', 64);
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('views')->default(0);
            $table->unsignedInteger('dwell_seconds')->default(0);
            $table->unsignedInteger('cart_adds')->default(0);
            $table->unsignedInteger('purchases')->default(0);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_purchased_at')->nullable();
            $table->timestamps();

            $table->unique(['visitor', 'product_id']);
            $table->index(['product_id', 'purchases']);
            $table->index('last_seen_at');
        });

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->string('visitor', 64)->index();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            // Null product = applies to the whole order.
            $table->foreignId('product_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('kind', 24);
            $table->unsignedTinyInteger('percent');
            $table->string('reason', 160);
            $table->timestamp('expires_at')->index();
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['visitor', 'kind', 'product_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('offer_discount', 10, 2)->default(0)->after('savings');
        });

        Schema::create('experiment_events', function (Blueprint $table) {
            $table->id();
            $table->string('experiment', 40);
            $table->string('variant', 20);
            $table->string('event', 30);
            $table->string('visitor', 64);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['experiment', 'variant', 'event']);
            $table->unique(['experiment', 'event', 'visitor']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('experiment_events');
        Schema::table('orders', fn (Blueprint $table) => $table->dropColumn('offer_discount'));
        Schema::dropIfExists('offers');
        Schema::dropIfExists('product_interactions');
        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['reviewed_at', 'review_note', 'auto_approved']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_admin']);
            $table->dropIndex(['banned_at']);
            $table->dropColumn(['is_admin', 'banned_at', 'ban_reason', 'locale', 'last_seen_at']);
        });
    }
};
