<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckUserStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if(Auth::check() && Auth::user()->is_active === true){
            return $next($request);
        }   

        if (Auth::check()) {    
            $user = Auth::user();
            $user->update(['is_active' => 0]); 
        }


        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login')->with('error', 'Akun anda belum aktif atau sesi anda habis');
    }
}
