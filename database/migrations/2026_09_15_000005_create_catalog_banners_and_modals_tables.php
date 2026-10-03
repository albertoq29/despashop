<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_path')->nullable();
            $table->string('image_mobile_path')->nullable();
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('link')->nullable();
            $table->string('text_position')->default('center'); // left | center | right
            $table->string('text_color')->nullable();
            $table->string('overlay')->default('none');          // none | light | dark | gradient
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active', 'display_order']);
        });

        Schema::create('catalog_modals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->string('image_path')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_link')->nullable();
            $table->string('size')->default('md');             // sm | md | lg
            $table->string('animation')->default('fade');       // fade | zoom | slide-up | bounce
            $table->string('trigger')->default('delay');        // load | delay | scroll | exit
            $table->unsignedInteger('delay_seconds')->default(3);
            $table->unsignedTinyInteger('scroll_percent')->default(50);
            $table->string('frequency')->default('once_session'); // always | once_session | once_day
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_modals');
        Schema::dropIfExists('catalog_banners');
    }
};
