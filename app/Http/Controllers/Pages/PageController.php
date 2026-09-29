<?php

namespace App\Http\Controllers\Pages;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pages\ContactRequest;
use App\Models\Brand;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

/** Content pages. Copy lives in resources/js/content so it ships with the page bundles. */
class PageController extends Controller
{
    public const LEGAL = ['privacy', 'terms', 'shipping', 'returns'];

    public function about(): Response
    {
        return Inertia::render('Pages/About', [
            'stats' => ['products' => Product::count(), 'brands' => Brand::count()],
        ]);
    }

    public function faq(): Response
    {
        return Inertia::render('Pages/Faq');
    }

    public function contact(): Response
    {
        return Inertia::render('Pages/Contact', ['topics' => ContactRequest::TOPICS]);
    }

    public function legal(string $page): Response
    {
        abort_unless(in_array($page, self::LEGAL, true), 404);

        return Inertia::render('Pages/Legal', ['page' => $page]);
    }
}
