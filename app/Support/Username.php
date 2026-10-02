<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Public handle assigned to every account: readable, calm and unique, e.g. "calm-heron-4821".
 * Customers can't change it (it identifies them to the care team); admins can.
 */
final class Username
{
    public const PATTERN = '/^[a-z][a-z0-9-]{2,38}[a-z0-9]$/';

    private const ADJECTIVES = ['calm', 'bright', 'gentle', 'steady', 'brave', 'kind', 'clear', 'fresh', 'quiet', 'swift', 'warm', 'bold',
        'sunny', 'lucky', 'wise', 'mellow', 'nimble', 'proud', 'merry', 'noble', 'happy', 'keen', 'lively', 'sage'];

    private const NOUNS = ['heron', 'cedar', 'falcon', 'lotus', 'otter', 'maple', 'willow', 'sparrow', 'river', 'comet', 'ember', 'harbor',
        'meadow', 'pebble', 'aspen', 'orchid', 'jasmine', 'lark', 'tiger', 'panda', 'dolphin', 'saffron', 'mint', 'pine'];

    public static function generate(): string
    {
        for ($i = 0; $i < 25; $i++) {
            $candidate = self::ADJECTIVES[random_int(0, count(self::ADJECTIVES) - 1)].'-'
                .self::NOUNS[random_int(0, count(self::NOUNS) - 1)].'-'
                .random_int(1000, 9999);
            if (! User::where('username', $candidate)->exists()) {
                return $candidate;
            }
        }

        return 'member-'.Str::lower(Str::random(10));
    }

    public static function valid(string $username): bool
    {
        return (bool) preg_match(self::PATTERN, $username) && ! str_contains($username, '--');
    }
}
