<?php

namespace App\Rules;

use App\Services\Security\ActivityLog;
use App\Services\Security\MalwareScanner;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/** Upload must pass the malware scan (see MalwareScanner). Put it after the type and size rules. */
class CleanFile implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            return;
        }
        $scanner = app(MalwareScanner::class);
        $result = $scanner->scan($value->getRealPath());

        if ($result['status'] === MalwareScanner::INFECTED) {
            ActivityLog::record('upload.infected', 'Rejected an upload flagged by the virus scanner', meta: ['signature' => $result['signature'], 'field' => $attribute]);
            $fail(__('This file failed our virus check, so we couldn\'t accept it. Please upload a fresh photo or scan.'));
        } elseif ($result['status'] === MalwareScanner::UNAVAILABLE && ! $scanner->failOpen()) {
            $fail(__('We couldn\'t check this file for viruses just now. Please try again in a few minutes.'));
        }
    }
}
