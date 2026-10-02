<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Services\Assistant\Assistant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Guided assistant: answers only the predefined questions, personalised server-side. */
class AssistantController extends Controller
{
    public function __invoke(Request $request, Assistant $assistant, string $intent): JsonResponse
    {
        abort_unless(array_key_exists($intent, Assistant::INTENTS), 404);

        return response()->json($assistant->answer($intent, $request->user()))
            ->header('Cache-Control', 'private, no-store');
    }
}
