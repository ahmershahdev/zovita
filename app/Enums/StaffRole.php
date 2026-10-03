<?php

namespace App\Enums;

/**
 * What each kind of staff member may do in the admin panel. Anything not listed here is refused,
 * so a new admin feature is owner-only until it is deliberately given to another role.
 */
enum StaffRole: string
{
    case Owner = 'owner';
    case Pharmacist = 'pharmacist';
    case Support = 'support';

    public const PERMISSIONS = [
        'dashboard',          // "Today at Zovita"
        'orders.view',
        'orders.update',      // move an order through its statuses
        'payments.refund',    // refund card payments, cancel paid orders
        'prescriptions.review',
        'products.manage',    // stock and price
        'customers.view',
        'customers.username',
        'customers.ban',
        'staff.manage',       // add/remove staff, change roles, reset two-factor
    ];

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Pharmacist => 'Pharmacist',
            self::Support => 'Support',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Owner => 'Everything, including refunds, bans and managing staff.',
            self::Pharmacist => 'Reviews prescriptions, keeps stock and prices right, and moves orders along.',
            self::Support => 'Helps customers: orders, customer profiles and usernames. No refunds or bans.',
        };
    }

    /** @return list<string> */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner => self::PERMISSIONS,
            self::Pharmacist => ['dashboard', 'orders.view', 'orders.update', 'prescriptions.review', 'products.manage'],
            self::Support => ['dashboard', 'orders.view', 'orders.update', 'customers.view', 'customers.username'],
        };
    }

    public function can(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    /** @return list<array{value: string, label: string, description: string}> */
    public static function options(): array
    {
        return array_map(fn (self $r) => ['value' => $r->value, 'label' => $r->label(), 'description' => $r->description()], self::cases());
    }
}
