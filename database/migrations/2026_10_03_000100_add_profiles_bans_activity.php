<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profiles (username, avatar, map location), graded bans with the identifiers they block, and a
 * per-customer activity log for the admin panel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 40)->nullable()->unique()->after('name');
            $table->string('avatar_path')->nullable()->after('email');
            $table->decimal('lat', 10, 7)->nullable()->after('address');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
            $table->timestamp('banned_until')->nullable()->after('banned_at');
            $table->string('last_login_ip', 45)->nullable()->after('last_seen_at');
            $table->timestamp('last_login_at')->nullable()->after('last_login_ip');
        });

        Schema::create('bans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('severity', 16); // temporary | permanent | deep
            $table->text('reason');
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lifted_at')->nullable();
            $table->foreignId('lifted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'lifted_at']);
        });

        Schema::create('ban_identifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ban_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // email | phone | device | fingerprint | ip | network
            $table->string('value', 191);
            $table->timestamps();

            $table->index(['type', 'value']);
        });

        Schema::create('user_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('description', 255);
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('device', 64)->nullable();
            $table->string('fingerprint', 64)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index('ip');
            $table->index('device');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_activities');
        Schema::dropIfExists('ban_identifiers');
        Schema::dropIfExists('bans');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'avatar_path', 'lat', 'lng', 'banned_until', 'last_login_ip', 'last_login_at']);
        });
    }
};
