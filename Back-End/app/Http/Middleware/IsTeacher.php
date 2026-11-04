<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsTeacher
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Silakan login terlebih dahulu.'
            ], 401);
        }

        if (!$request->user()->isTeacher()) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses.'
            ], 403);
        }

        return $next($request);
    }
}