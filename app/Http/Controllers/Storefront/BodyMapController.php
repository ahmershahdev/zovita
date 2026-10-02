<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Support\BodyMap;
use App\Support\ShopPath;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class BodyMapController extends Controller
{
    public function show(): Response
    {
        $model = public_path('models/body.bin');

        return Inertia::render('BodyMap/Show', [
            'regions' => BodyMap::regions(),
            // Baked by tools/bodymap/build-body.mjs; versioned so a rebuilt mesh is never served stale.
            'model' => asset('models/body.bin').'?v='.(is_file($model) ? filemtime($model) : 0),
        ]);
    }

    /** Products for one symptom: in-stock and over-the-counter first. */
    public function recommend(string $symptom): JsonResponse
    {
        $symptom = BodyMap::symptom($symptom);
        abort_unless($symptom, 404);

        $payload = [
            'symptom' => collect($symptom)->only('key', 'label', 'region', 'note', 'flags', 'urgent'),
            'products' => [],
            'categories' => [],
        ];

        if ($symptom['urgent'] || ! $symptom['categories']) {
            return response()->json($payload);
        }

        $categories = Category::whereIn('slug', $symptom['categories'])->with('department:id,slug')->get();
        $order = array_flip($symptom['categories']);

        $payload['categories'] = $categories
            ->sortBy(fn (Category $c) => $order[$c->slug] ?? 99)
            ->map(fn (Category $c) => [
                'name' => $c->name,
                'href' => ShopPath::url($c->department->slug, ['category' => $c->slug]),
            ])->values();

        $payload['products'] = Product::with('brand', 'category')
            ->listed()
            ->whereIn('category_id', $categories->pluck('id'))
            ->orderByRaw('stock > 0 DESC')
            ->orderBy('requires_prescription')
            ->orderByDesc('is_featured')
            ->orderByRaw('sale_price IS NOT NULL DESC')
            ->limit(12)
            ->get()
            ->map->toCard();

        return response()->json($payload);
    }
}
