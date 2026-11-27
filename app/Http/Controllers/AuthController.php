<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    /** Role yang boleh masuk portal manajemen. */
    private const MANAGEMENT_ROLES = ['ADMIN'];

    private function isManagementRole(?string $role): bool
    {
        return in_array(strtoupper((string) $role), self::MANAGEMENT_ROLES, true);
    }

    // Tampilkan halaman login tunggal untuk semua role
    public function create()
    {
        return Inertia::render('auth/login', [
            'portal' => 'inspection',
            'action' => '/login',
        ]);
    }

    // Proses login tunggal (Admin & seluruh role operasional)
    public function store(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt([
            'username' => trim($credentials['username']),
            'password' => $credentials['password'],
        ])) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            $request->session()->regenerate();

            $user->update([
                'is_active' => 1,
                'last_login_at' => now(),
            ]);

            return redirect()->intended('/dashboard');
        }

        return back()->withErrors([
            'password' => 'Username atau Password yang Anda masukkan salah.',
        ])->onlyInput('username');
    }

    // Logout — semua role kembali ke /login
    public function destroy(Request $request)
    {
        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $user->update(['is_active' => 0]);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
