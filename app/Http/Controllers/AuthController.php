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

    // Tampilkan halaman login aplikasi inspeksi (selain role manajemen)
    public function create()
    {
        return Inertia::render('auth/login', [
            'portal' => 'inspection',
            'action' => '/login',
        ]);
    }

    // Tampilkan halaman login portal manajemen (khusus ADMIN)
    public function adminCreate()
    {
        return Inertia::render('auth/login', [
            'portal' => 'management',
            'action' => '/admin/login',
        ]);
    }

    // Proses login aplikasi inspeksi
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

            // Pemisahan portal: akun manajemen tidak boleh login lewat aplikasi inspeksi.
            if ($this->isManagementRole($user->role)) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'password' => 'Akun manajemen. Silakan login melalui Portal Manajemen.',
                ])->onlyInput('username');
            }

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

    // Proses login portal manajemen
    public function adminStore(Request $request)
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

            // Pemisahan portal: hanya ADMIN yang boleh masuk manajemen.
            if (! $this->isManagementRole($user->role)) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'password' => 'Akun aplikasi inspeksi. Silakan login melalui Aplikasi Inspeksi.',
                ])->onlyInput('username');
            }

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

    // Logout
    public function destroy(Request $request)
    {
        $loginPath = '/login';

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $user->update(['is_active' => 0]);

            $loginPath = $this->isManagementRole($user->role) ? '/admin/login' : '/login';
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect($loginPath);
    }
}
