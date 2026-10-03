<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use BelongsToTenant;

    protected $fillable = ['name'];

    public function products()
    {
        return $this->belongsToMany(Product::class);
    }
}
