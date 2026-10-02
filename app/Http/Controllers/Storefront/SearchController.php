<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /** Instant-search suggestions for the header search overlay. */
    public function __invoke(Request $request): JsonResponse
    {
        $term = mb_substr(trim($request->query->getString('q')), 0, 60);
        if (mb_strlen($term) < 2) {
            return response()->json(['products' => [], 'categories' => []]);
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';

        return response()->json([
            'products' => Product::with('brand', 'category')->listed()->search($term)
                ->orderByRaw('name LIKE ? DESC', [str_replace(['%', '_'], ['\%', '\_'], $term).'%'])
                ->orderByRaw('stock > 0 DESC')
                ->limit(6)->get()->map->toCard(),
            'categories' => Category::where('name', 'like', $like)->limit(4)->get(['name', 'slug']),
        ]);
    }
}
