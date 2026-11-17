<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Inertia\Inertia;

class AuthController extends Controller {

    /** Role yang boleh masuk portal manajemen. */
    private const MANAGEMENT_ROLES = ['ADMIN'];

    private function isManagementRole(?string $role): bool
    {
        return in_array(strtoupper((string) $role), self::MANAGEMENT_ROLES, true);
    }

    private function formatUsers($users)
    {
        return $users->map(function ($user) {
            return [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'role' => $user->role ? [
                    'id' => $user->id,
                    'name' => $user->role,
                ] : null,
                'is_active' => $user->is_active,
            ];
        })->values();
    }

    // Tampilkan halaman login aplikasi inspeksi (selain role manajemen)
    public function create()
    {
        $users = User::all()->reject(fn ($u) => $this->isManagementRole($u->role))->values();

        return Inertia::render('auth/login', [
            'users' => $this->formatUsers($users),
            'portal' => 'inspection',
            'action' => '/login',
        ]);
    }

    // Tampilkan halaman login portal manajemen (khusus ADMIN)
    public function adminCreate()
    {
        $users = User::all()->filter(fn ($u) => $this->isManagementRole($u->role))->values();

        return Inertia::render('auth/login', [
            'users' => $this->formatUsers($users),
            'portal' => 'management',
            'action' => '/admin/login',
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
            $user = Auth::user();

            // Pemisahan portal: akun manajemen tidak boleh login lewat aplikasi inspeksi.
            if ($this->isManagementRole($user->role)) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'password' => 'Akun manajemen. Silakan login melalui Portal Manajemen.',
                ])->onlyInput('full_name', 'role');
            }

            $request->session()->regenerate();

            $user->update([
                'is_active' => 1,
                'last_login_at' => now(),
            ]);

            return redirect()->intended('/dashboard');
        }

        return back()->withErrors([
            'password' => 'Nama, Role, atau Password yang Anda masukkan salah.',
        ])->onlyInput('full_name', 'role');
    }

    // Proses login portal manajemen
    public function adminStore(Request $request)
    {
        $credentials = $request->validate([
            'full_name' => ['required', 'string'],
            'role' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt([
            'full_name' => $credentials['full_name'],
            'role' => $credentials['role'],
            'password' => $credentials['password'],
        ])) {
            $user = Auth::user();

            // Pemisahan portal: hanya ADMIN yang boleh masuk manajemen.
            if (! $this->isManagementRole($user->role)) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors([
                    'password' => 'Akun aplikasi inspeksi. Silakan login melalui Aplikasi Inspeksi.',
                ])->onlyInput('full_name', 'role');
            }

            $request->session()->regenerate();

            $user->update([
                'is_active' => 1,
                'last_login_at' => now(),
            ]);

            return redirect()->intended('/dashboard');
        }

        return back()->withErrors([
            'password' => 'Nama, Role, atau Password yang Anda masukkan salah.',
        ])->onlyInput('full_name', 'role');
    }

    // Logout
    public function destroy(Request $request)
    {

        $loginPath = '/login';

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            // Ubah statusnya jadi 0 (Tidak aktif) saat logout
            $user->update(['is_active' => 0]);

            $loginPath = $this->isManagementRole($user->role) ? '/admin/login' : '/login';
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect($loginPath);
    }
}