<?php

namespace App\Enums;

enum PrescriptionStatus: string
{
    case Received = 'received';
    case Reviewing = 'reviewing';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
