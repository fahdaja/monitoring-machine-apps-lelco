<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Inertia\Inertia;

class AuthController extends Controller {

    // Tampilkan halaman login
    public function create()
    {
        $users = User::with('roles')->get();

        $formattedUsers = $users->map(function ($user) {
            return [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'role' => $user->role ? [
                    'id' => $user->id,
                    'name' => $user->role,
                ] : null,
                'is_active' => $user->is_active,
            ];
        });

        return Inertia::render('auth/login', [
            'users' => $formattedUsers
        ]);
    }

    // Proses login
    public function store(Request $request)
    {
       // 1. Validasi input yang dikirim dari form
        $credentials = $request->validate([
            'full_name' => ['required', 'string'],
            'role' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // 2. Gunakan Auth::attempt dengan array kolom kustom Anda
        // Laravel akan otomatis mencocokkan full_name, role, DAN memverifikasi ke-hash-an password-nya
        if (Auth::attempt([
            'full_name' => $credentials['full_name'], 
            'role' => $credentials['role'], 
            'password' => $credentials['password']
        ])) {
            $request->session()->regenerate();
            return redirect()->intended('/dashboard');
        }

        // 3. Jika gagal, kembalikan dengan pesan error
        return back()->withErrors([
            'password' => 'Nama, Role, atau Password yang Anda masukkan salah.',
        ])->onlyInput('full_name', 'role');
    }

    // Logout
    public function destroy(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/login');
    }
}