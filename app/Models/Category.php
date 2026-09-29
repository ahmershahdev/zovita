<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['department_id', 'name', 'slug'];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
