<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('how_it_works')->nullable()->after('precautions');
            $table->text('highlights')->nullable()->after('how_it_works');
            $table->text('warnings')->nullable()->after('highlights');
            // Alternatives ("same salt, other brands") are looked up by generic name.
            $table->index('generics');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['generics']);
            $table->dropColumn(['how_it_works', 'highlights', 'warnings']);
        });
    }
};
