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
        return match ($this) {
            self::Received => 'Pending review',
            self::Reviewing => 'In review',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
        };
    }
}
