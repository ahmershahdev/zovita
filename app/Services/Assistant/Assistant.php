<?php

namespace App\Services\Assistant;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Prescription;
use App\Models\User;
use App\Services\Cart\CartService;
use App\Services\Personalization\OfferEngine;
use App\Services\Personalization\Recommender;
use Illuminate\Support\Carbon;

/**
 * The guided assistant. Visitors can't type free text — they pick from suggested questions, and
 * every answer is composed on the server from *their* data (orders, bag, offers, prescriptions,
 * browsing). That keeps it fast, private, impossible to prompt-inject and always accurate.
 *
 * An answer is { text, cards?, links?, followups } where followups are the next question ids.
 */
class Assistant
{
    public const INTENTS = [
        'start' => 'Hi!',
        'order_status' => 'Where is my order?',
        'offers' => 'Do I have any discounts?',
        'recommend' => 'What would you recommend for me?',
        'buy_again' => 'Reorder something I bought before',
        'prescription' => "What's happening with my prescription?",
        'bag' => "What's in my bag?",
        'delivery' => 'When will my order arrive?',
        'returns' => 'How do returns work?',
        'payment' => 'How do I pay?',
        'symptom' => 'I have a symptom — where do I start?',
        'human' => 'Talk to a person',
    ];

    public function __construct(
        private readonly CartService $cart,
        private readonly OfferEngine $offers,
        private readonly Recommender $recommender,
    ) {}

    /** Questions offered first, ordered by what is most relevant to this visitor right now. */
    public function suggestions(?User $user): array
    {
        $ids = [];
        if ($user && Order::where('user_id', $user->id)->whereNotIn('status', [OrderStatus::Delivered, OrderStatus::Cancelled])->exists()) {
            $ids[] = 'order_status';
        }
        if ($user && Prescription::where('user_id', $user->id)->where('created_at', '>=', now()->subDays(7))->exists()) {
            $ids[] = 'prescription';
        }
        if ($this->offers->active()->isNotEmpty()) {
            $ids[] = 'offers';
        }
        if (! $this->cart->isEmpty()) {
            $ids[] = 'bag';
        }
        array_push($ids, 'recommend', 'delivery', 'symptom', 'returns', 'payment', 'order_status', 'human');

        return $this->chips(array_slice(array_values(array_unique($ids)), 0, 6));
    }

    public function answer(string $intent, ?User $user): array
    {
        $name = $user ? strtok($user->name, ' ') : null;
        $answer = match ($intent) {
            'start' => $this->start($name, $user),
            'order_status' => $this->orderStatus($user),
            'offers' => $this->offersAnswer(),
            'recommend' => $this->recommend(),
            'buy_again' => $this->buyAgain(),
            'prescription' => $this->prescription($user),
            'bag' => $this->bag(),
            'delivery' => $this->delivery($user),
            'returns' => [
                'text' => 'Unopened, room-temperature items can be returned within 7 days of delivery. If anything arrives damaged or wrong, tell us within 48 hours with a photo — we replace it or refund you in full, delivery included.',
                'links' => [['label' => 'Returns policy', 'href' => route('legal', 'returns')]],
                'followups' => ['human', 'order_status'],
            ],
            'payment' => [
                'text' => 'Every order is cash on delivery — no card needed. Check that the parcel is sealed, then pay the rider the amount on your invoice. Personal offers are taken off automatically before you pay.',
                'followups' => ['offers', 'delivery'],
            ],
            'symptom' => [
                'text' => 'Try the body map: tap where it hurts, pick what you feel, and you\'ll get self-care tips, warning signs and products our pharmacists would suggest. If it feels like an emergency, call 1122 right away.',
                'links' => [['label' => 'Open the body map', 'href' => route('body-map')]],
                'followups' => ['recommend', 'human'],
            ],
            'human' => $this->human(),
            default => null,
        };

        if (! $answer) {
            return ['text' => "I didn't catch that — pick one of these.", 'followups' => ['order_status', 'offers', 'recommend', 'human']];
        }
        $answer['followups'] = $this->chips($answer['followups'] ?? []);

        return $answer;
    }

    private function start(?string $name, ?User $user): array
    {
        $hour = (int) now()->timezone('Asia/Karachi')->format('G');
        $greeting = $hour < 12 ? 'Good morning' : ($hour < 17 ? 'Good afternoon' : 'Good evening');

        return [
            'text' => $name
                ? "{$greeting}, {$name}. I know your orders, bag and offers — what can I help with?"
                : "{$greeting}! I'm the Zovita assistant. Pick a question and I'll answer from your bag and browsing — sign in and I can check your orders too.",
            'followups' => array_column($this->suggestions($user), 'id'),
        ];
    }

    private function orderStatus(?User $user): array
    {
        if (! $user) {
            return [
                'text' => 'I can look up orders once you\'re signed in. Or track any order with its number and email.',
                'links' => [['label' => 'Track an order', 'href' => route('orders.track')], ['label' => 'Sign in', 'href' => route('login')]],
                'followups' => ['delivery', 'human'],
            ];
        }
        $orders = Order::withCount('items')->where('user_id', $user->id)->latest()->limit(3)->get();
        if ($orders->isEmpty()) {
            return ['text' => "You haven't placed an order yet. When you do, I'll track it here.", 'followups' => ['recommend', 'offers']];
        }
        $latest = $orders->first();
        $text = "Your latest order {$latest->number} is \"{$latest->status->label()}\" — placed {$latest->created_at->diffForHumans()}";
        if (! in_array($latest->status, [OrderStatus::Delivered, OrderStatus::Cancelled], true)) {
            $text .= ', '.$this->eta($latest->city, $latest->created_at);
        }

        return [
            'text' => $text.'.',
            'cards' => $orders->map(fn (Order $o) => [
                'title' => $o->number,
                'meta' => $o->status->label().' · '.$o->created_at->format('j M'),
                'value' => 'Rs '.number_format($o->total),
                'href' => route('account.orders.show', $o),
            ])->all(),
            'followups' => ['delivery', 'returns', 'human'],
        ];
    }

    private function offersAnswer(): array
    {
        $offers = $this->offers->active();
        if ($offers->isEmpty()) {
            return [
                'text' => "No personal offers right now. They unlock as you shop — products you keep coming back to, your regulars, and loyalty rewards after a few orders. I'll let you know.",
                'followups' => ['recommend', 'bag'],
            ];
        }

        return [
            'text' => 'You have '.$offers->count().' personal '.($offers->count() === 1 ? 'offer' : 'offers').'. They\'re applied automatically in your bag — no code needed.',
            'cards' => $offers->map(fn ($o) => [
                'title' => $o->product?->name ?? 'Your whole order',
                'meta' => $o->reason.' · ends '.$o->expires_at->diffForHumans(),
                'value' => "−{$o->percent}%",
                'href' => $o->product ? route('products.show', $o->product->slug) : route('cart.index'),
            ])->values()->all(),
            'followups' => ['bag', 'recommend'],
        ];
    }

    private function recommend(): array
    {
        $rails = $this->recommender->rails(4);
        if (! $rails['for_you']) {
            return [
                'text' => 'Browse a little and I\'ll learn what you need. Meanwhile, the body map is a great place to start from a symptom.',
                'links' => [['label' => 'Shop the pharmacy', 'href' => route('shop.index')], ['label' => 'Body map', 'href' => route('body-map')]],
                'followups' => ['symptom', 'offers'],
            ];
        }

        return [
            'text' => 'Based on '.implode(', ', $rails['top_categories'] ?: ['what you browse']).', these are in stock and suit you:',
            'cards' => $this->productCards($rails['for_you']),
            'followups' => $rails['buy_again'] ? ['buy_again', 'offers'] : ['offers', 'bag'],
        ];
    }

    private function buyAgain(): array
    {
        $rails = $this->recommender->rails(4);

        return $rails['buy_again']
            ? ['text' => 'Your regulars — one tap from the product page to your bag:', 'cards' => $this->productCards($rails['buy_again']), 'followups' => ['offers', 'bag']]
            : ['text' => 'Once you\'ve ordered, your regular items will show up here for quick reordering.', 'followups' => ['recommend']];
    }

    private function prescription(?User $user): array
    {
        $latest = $user ? Prescription::where('user_id', $user->id)->latest()->first() : null;
        if (! $latest) {
            return [
                'text' => 'Upload a clear photo or PDF of your prescription and a pharmacist reviews it. If we haven\'t decided within 24 hours, it\'s approved automatically so you\'re never left waiting.',
                'links' => [['label' => 'Upload a prescription', 'href' => route('prescriptions.create')]],
                'followups' => ['human', 'payment'],
            ];
        }
        $text = "Prescription {$latest->reference} is \"{$latest->status->label()}\"";
        if ($due = $latest->autoDecisionAt()) {
            $text .= '. A pharmacist will review it '.($due->isPast() ? 'any moment now' : 'by '.$due->format('j M, g:i A')).' — if not, it\'s approved automatically then';
        } elseif ($latest->review_note) {
            $text .= ". Pharmacist note: {$latest->review_note}";
        }

        return ['text' => $text.'.', 'followups' => ['order_status', 'human']];
    }

    private function bag(): array
    {
        $summary = $this->cart->summary();
        if (! $summary['count']) {
            return ['text' => 'Your bag is empty.', 'links' => [['label' => 'Start shopping', 'href' => route('shop.index')]], 'followups' => ['recommend', 'offers']];
        }
        $remaining = max(0, $summary['free_delivery_over'] - ($summary['subtotal'] - $summary['savings']));
        $text = "You have {$summary['count']} ".($summary['count'] === 1 ? 'item' : 'items').' — total Rs '.number_format($summary['total']).'.';
        if ($summary['offer_discount'] > 0) {
            $text .= ' Personal offers are saving you Rs '.number_format($summary['offer_discount']).'.';
        }
        $text .= $remaining > 0 ? ' Add Rs '.number_format($remaining).' more for free delivery.' : ' Delivery is free.';
        if ($summary['requires_prescription']) {
            $text .= ' It includes prescription medicine — you\'ll attach the prescription at checkout.';
        }

        return ['text' => $text, 'links' => [['label' => 'Go to checkout', 'href' => route('checkout.create')]], 'followups' => ['offers', 'delivery', 'payment']];
    }

    private function delivery(?User $user): array
    {
        $city = $user?->city;

        return [
            'text' => ($city ? 'To '.$city.', '.$this->eta($city, now()) : 'Major cities usually get orders in 1–3 business days, other areas in 2–5').'. Orders confirmed before 2 PM ship the same day, and delivery is free over Rs '.number_format((int) config('zovita.free_delivery_over')).'.',
            'links' => [['label' => 'Shipping details', 'href' => route('legal', 'shipping')]],
            'followups' => ['order_status', 'payment'],
        ];
    }

    private function human(): array
    {
        $now = now()->timezone('Asia/Karachi');
        $open = $now->dayOfWeek !== Carbon::SUNDAY && $now->hour >= 10 && $now->hour < 20;

        return [
            'text' => ($open ? 'Our care team is online now. ' : 'Our care team is offline right now ('.config('zovita.support_hours').'), but messages are answered first thing. ')
                .'Call '.config('zovita.support_phone').' or send a message.',
            'links' => [['label' => 'Contact us', 'href' => route('contact')], ['label' => 'Call '.config('zovita.support_phone'), 'href' => 'tel:'.preg_replace('/\s+/', '', (string) config('zovita.support_phone'))]],
            'followups' => ['returns', 'order_status'],
        ];
    }

    private function eta(?string $city, Carbon $from): string
    {
        $major = in_array($city, ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi'], true);
        $days = $major ? [1, 3] : [2, 5];

        return 'expected between '.$from->copy()->addWeekdays($days[0])->format('D j M').' and '.$from->copy()->addWeekdays($days[1])->format('D j M');
    }

    private function productCards(array $cards): array
    {
        return array_map(fn ($p) => [
            'title' => $p['name'],
            'meta' => $p['brand'],
            'value' => 'Rs '.number_format($p['current_price']),
            'image' => $p['thumb'],
            'href' => route('products.show', $p['slug']),
        ], array_slice($cards, 0, 4));
    }

    private function chips(array $ids): array
    {
        return array_values(array_map(fn ($id) => ['id' => $id, 'label' => __(self::INTENTS[$id])], array_filter(array_unique($ids), fn ($id) => isset(self::INTENTS[$id]) && $id !== 'start')));
    }
}
