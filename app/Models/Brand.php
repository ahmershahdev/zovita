<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    protected $fillable = ['name', 'slug', 'logo_path'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Storefront name for a manufacturer: the local subsidiary suffix and the company-form tail
     * that follows it are dropped ("Searle Pakistan (Pvt) Ltd." → "Searle").
     */
    public static function cleanName(string $name): string
    {
        $clean = preg_replace('/\s*\bPakistan\b\s*(?:\(?\s*pvt\.?\s*\)?\s*)?(?:ltd\.?|limited)?\s*/iu', ' ', $name);

        $clean = preg_replace(['/\s{2,}/', '/\bProd$/'], [' ', 'Products'], trim($clean));

        return $clean ?: $name;
    }
}
