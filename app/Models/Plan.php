<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Plan extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'price_usd' => 'decimal:2',
            'price_bs' => 'decimal:2',
            'features' => 'array',
            'allows_custom_domain' => 'boolean',
            'allows_invoice_branding' => 'boolean',
            'allows_catalog_branding' => 'boolean',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Plan $plan) {
            if (blank($plan->slug)) {
                $plan->slug = Str::slug($plan->name);
            }
        });
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopePublic($query)
    {
        return $query->where('is_active', true)
            ->where('is_public', true)
            ->orderBy('display_order')
            ->orderBy('price_usd');
    }

    /** null = ilimitado */
    public function allows(string $limit, int $current): bool
    {
        $max = $this->{$limit};

        return $max === null || $current < $max;
    }
}
