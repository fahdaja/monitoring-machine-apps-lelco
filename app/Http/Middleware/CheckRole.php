<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        // dd($request->user(), $roles);

        if($request->user()){
            $userRole = strtoupper($request->user()->role);
            $allowedRoles = array_map('strtoupper', $roles);

            if(in_array($userRole, $allowedRoles)){
                return $next($request);
            }
            
        }
        abort(403, 'Anda tidak memiliki akses ke halaman ini.');
    }
}
