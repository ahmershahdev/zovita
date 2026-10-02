<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\PrescriptionStatus;
use App\Models\ExperimentEvent;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\Product;
use App\Models\ProductInteraction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Realistic demo activity for the admin dashboard and screenshots:
 *   php artisan db:seed --class=DemoActivitySeeder
 * Creates customers, ~90 days of orders, prescriptions in every state, browsing signals,
 * personal offers and A/B events. Refuses to run in production.
 */
class DemoActivitySeeder extends Seeder
{
    private const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];

    private const NAMES = ['Ayesha Khan', 'Bilal Ahmed', 'Sana Malik', 'Usman Tariq', 'Hira Siddiqui', 'Ali Raza', 'Fatima Noor', 'Hamza Iqbal',
        'Zainab Hussain', 'Omar Farooq', 'Mehwish Ali', 'Saad Qureshi', 'Iqra Javed', 'Danish Shah', 'Nimra Aslam', 'Fahad Butt',
        'Amna Rehman', 'Talha Mirza', 'Maryam Akhtar', 'Haris Chaudhry', 'Rabia Anwar', 'Kamran Haider', 'Sadia Yousaf', 'Asad Khan'];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('DemoActivitySeeder never runs in production.');

            return;
        }

        mt_srand(42);
        $products = Product::listed()->where('stock', '>', 0)->inRandomOrder()->limit(220)->get();
        $popular = $products->take(40);

        $users = collect(self::NAMES)->map(fn ($name, $i) => User::firstOrCreate(
            ['email' => Str::slug($name, '.').'@example.com'],
            ['name' => $name, 'password' => 'password', 'city' => self::CITIES[$i % count(self::CITIES)], 'phone' => '0300'.str_pad((string) (1000000 + $i), 7, '0')],
        ));
        $users->each(fn ($u, $i) => $u->forceFill([
            'created_at' => now()->subDays(mt_rand(5, 120)),
            'last_seen_at' => now()->subHours(mt_rand(1, 400)),
        ])->saveQuietly());
        $users->get(5)?->forceFill(['banned_at' => now()->subDays(3), 'ban_reason' => 'Repeated orders with forged prescriptions'])->saveQuietly();

        DB::transaction(function () use ($users, $products, $popular) {
            for ($day = 89; $day >= 0; $day--) {
                // Gentle growth plus weekly rhythm.
                $count = max(0, (int) round(2 + (89 - $day) / 22 + (now()->subDays($day)->isWeekend() ? 2 : 0) + mt_rand(-1, 2)));
                for ($n = 0; $n < $count; $n++) {
                    $user = mt_rand(0, 3) ? $users->random() : null;
                    $at = now()->subDays($day)->setTime(mt_rand(9, 22), mt_rand(0, 59));
                    $lines = (mt_rand(0, 2) ? $popular : $products)->random(mt_rand(1, 4));
                    $subtotal = 0;
                    $payable = 0;
                    $items = [];
                    foreach ($lines as $p) {
                        $q = mt_rand(1, 3);
                        $subtotal += $p->price * $q;
                        $payable += $p->current_price * $q;
                        $items[] = ['product_id' => $p->id, 'name' => $p->name, 'slug' => $p->slug, 'image' => $p->image, 'unit_price' => $p->current_price, 'quantity' => $q, 'line_total' => round($p->current_price * $q, 2)];
                    }
                    $offer = mt_rand(0, 5) === 0 ? round($payable * 0.07, 2) : 0;
                    $delivery = $payable >= 2500 ? 0 : 150;
                    $status = match (true) {
                        $day > 6 => mt_rand(0, 12) === 0 ? OrderStatus::Cancelled : OrderStatus::Delivered,
                        $day > 3 => [OrderStatus::Shipped, OrderStatus::Delivered][mt_rand(0, 1)],
                        $day > 0 => [OrderStatus::Confirmed, OrderStatus::Packed][mt_rand(0, 1)],
                        default => OrderStatus::Pending,
                    };
                    $order = Order::create([
                        'user_id' => $user?->id,
                        'number' => 'ZV-'.$at->format('ymd').'-'.Str::upper(Str::random(5)),
                        'status' => $status,
                        'customer_name' => $user?->name ?? self::NAMES[array_rand(self::NAMES)],
                        'email' => $user?->email ?? 'guest'.mt_rand(100, 999).'@example.com',
                        'phone' => '03001234567',
                        'address' => 'House '.mt_rand(1, 200).', Street '.mt_rand(1, 40),
                        'city' => $user?->city ?? self::CITIES[array_rand(self::CITIES)],
                        'payment_method' => 'cod',
                        'subtotal' => round($subtotal, 2),
                        'savings' => round($subtotal - $payable, 2),
                        'offer_discount' => $offer,
                        'delivery_fee' => $delivery,
                        'total' => round($payable - $offer + $delivery, 2),
                    ]);
                    $order->items()->createMany($items);
                    $order->forceFill(['created_at' => $at, 'updated_at' => $at])->saveQuietly();
                }
            }

            // Browsing signals → funnel and recommendations.
            foreach ($users as $user) {
                foreach ($products->random(mt_rand(6, 18)) as $p) {
                    $views = mt_rand(1, 6);
                    ProductInteraction::updateOrCreate(['visitor' => 'u:'.$user->id, 'product_id' => $p->id], [
                        'user_id' => $user->id,
                        'views' => $views,
                        'dwell_seconds' => $views * mt_rand(5, 40),
                        'cart_adds' => mt_rand(0, 3) ? 0 : 1,
                        'purchases' => mt_rand(0, 4) ? 0 : mt_rand(1, 3),
                        'last_seen_at' => now()->subDays(mt_rand(0, 25)),
                    ]);
                }
            }
            for ($g = 0; $g < 160; $g++) {
                $visitor = 'g:'.Str::uuid();
                foreach ($products->random(mt_rand(1, 4)) as $p) {
                    ProductInteraction::create(['visitor' => $visitor, 'product_id' => $p->id, 'views' => mt_rand(1, 3), 'dwell_seconds' => mt_rand(3, 70), 'cart_adds' => mt_rand(0, 5) ? 0 : 1, 'last_seen_at' => now()->subDays(mt_rand(0, 29))]);
                }
            }

            // Offers issued and redeemed.
            foreach ($users->random(14) as $i => $user) {
                $kind = array_keys(Offer::KINDS)[$i % 6];
                $productScoped = in_array($kind, ['hesitation', 'cart_rescue', 'regular'], true);
                Offer::create([
                    'visitor' => 'u:'.$user->id, 'user_id' => $user->id,
                    'product_id' => $productScoped ? $products->random()->id : null,
                    'kind' => $kind, 'percent' => [8, 5, 10, 5, 5, 7][$i % 6], 'reason' => Offer::KINDS[$kind],
                    'expires_at' => now()->addDays(mt_rand(-5, 10)),
                    'redeemed_at' => mt_rand(0, 2) ? null : now()->subDays(mt_rand(0, 20)),
                ])->forceFill(['created_at' => now()->subDays(mt_rand(0, 28))])->saveQuietly();
            }

            // A/B events with a modest real difference between variants.
            foreach (config('zovita.experiments') as $name => $def) {
                foreach ($def['variants'] as $vi => $variant) {
                    for ($v = 0; $v < 240; $v++) {
                        $visitor = "demo:{$name}:{$variant}:{$v}";
                        $events = ['exposure'];
                        if (mt_rand(1, 100) <= 28 + $vi * 6) {
                            $events[] = 'click';
                        }
                        if (mt_rand(1, 100) <= 12 + $vi * 3) {
                            $events[] = 'add_to_cart';
                        }
                        if (mt_rand(1, 100) <= 4 + $vi * 2) {
                            $events[] = 'purchase';
                        }
                        foreach ($events as $event) {
                            ExperimentEvent::insertOrIgnore(['experiment' => $name, 'variant' => $variant, 'event' => $event, 'visitor' => $visitor, 'created_at' => now()->subDays(mt_rand(0, 29))]);
                        }
                    }
                }
            }
        });

        // Prescriptions in every state, including some close to the 24h auto-approval.
        foreach ($users->random(9) as $i => $user) {
            $hoursAgo = [2, 9, 17, 22, 30, 50, 70, 3, 12][$i];
            $status = match (true) {
                $i < 4 || $i >= 7 => PrescriptionStatus::Received,
                $i === 4 => PrescriptionStatus::Approved,
                $i === 5 => PrescriptionStatus::Rejected,
                default => PrescriptionStatus::Approved,
            };
            $p = Prescription::create([
                'user_id' => $user->id, 'reference' => Prescription::generateReference(), 'name' => $user->name, 'email' => $user->email,
                'phone' => $user->phone ?? '03001234567', 'file_path' => 'prescriptions/demo-'.($i + 1).'.png', 'original_name' => 'prescription-'.($i + 1).'.png',
                'notes' => $i % 3 === 0 ? 'Monthly refill for my mother — please call after 5 PM.' : null,
                'status' => $status,
                'reviewed_at' => $status === PrescriptionStatus::Received ? null : now()->subHours($hoursAgo - 3),
                'review_note' => $status === PrescriptionStatus::Rejected ? 'Prescription is older than 6 months.' : null,
            ]);
            $p->forceFill(['created_at' => now()->subHours($hoursAgo)])->saveQuietly();
            $this->demoImage($p->file_path, $p->reference);
        }

        $this->command?->info('Demo activity seeded: '.Order::count().' orders, '.User::count().' customers.');
    }

    /** A plain generated image so the review screen has something to show. */
    private function demoImage(string $path, string $reference): void
    {
        $disk = Storage::disk(config('zovita.prescriptions.disk'));
        if ($disk->exists($path) || ! function_exists('imagecreatetruecolor')) {
            return;
        }
        $im = imagecreatetruecolor(600, 800);
        imagefill($im, 0, 0, imagecolorallocate($im, 252, 251, 247));
        $ink = imagecolorallocate($im, 11, 27, 51);
        $line = imagecolorallocate($im, 200, 205, 210);
        imagestring($im, 5, 40, 40, 'Dr. Example Clinic', $ink);
        imagestring($im, 3, 40, 70, 'Reg. No. 00000 - DEMO ONLY', $ink);
        imagestring($im, 5, 40, 130, "Rx  {$reference}", $ink);
        for ($y = 190; $y < 700; $y += 46) {
            imageline($im, 40, $y, 560, $y, $line);
        }
        imagestring($im, 4, 40, 200, 'Tab. Example 500mg  1+0+1  x 5 days', $ink);
        imagestring($im, 4, 40, 246, 'Syp. Example 5ml   0+0+1  x 7 days', $ink);
        ob_start();
        imagepng($im);
        $disk->put($path, (string) ob_get_clean());
        imagedestroy($im);
    }
}
