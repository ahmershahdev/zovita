<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExperimentEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['experiment', 'variant', 'event', 'visitor'];
}
