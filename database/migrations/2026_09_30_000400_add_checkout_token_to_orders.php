<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // One order per checkout attempt: a double-click or network retry reuses the same token,
            // and the unique index makes the second insert impossible even under a race.
            $table->uuid('checkout_token')->nullable()->unique()->after('number');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['checkout_token']);
            $table->dropColumn('checkout_token');
        });
    }
};
