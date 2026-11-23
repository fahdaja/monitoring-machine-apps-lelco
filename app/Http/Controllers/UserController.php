<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

class UserController extends Controller
{
    /**
     * Jumlah ADMIN selain user dengan id tertentu (untuk cegah sistem terkunci).
     */
    private function otherAdmins($excludeId): int
    {
        return User::query()
            ->whereRaw('UPPER(role) = ?', [User::ROLE_ADMIN])
            ->where('id', '!=', $excludeId)
            ->count();
    }

    public function index()
    {
        $users = User::select('id', 'user_code', 'username', 'email', 'full_name', 'department', 'role', 'phone_number', 'is_active')
            ->whereRaw('UPPER(role) <> ?', [User::ROLE_ADMIN])
            ->orderBy('id', 'asc')
            ->get();

        return Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        $roles = Role::select('id', 'name')
            ->whereRaw('UPPER(name) <> ?', [User::ROLE_ADMIN])
            ->get();
        $departments = Department::select('id', 'name')->get();
        return Inertia::render('users/create', [
            'roles' => $roles,
            'departments' => $departments,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'username' => 'required|string|alpha_dash|unique:users,username|max:50',
            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where(fn ($q) => $q->whereRaw('UPPER(name) <> ?', [User::ROLE_ADMIN])),
            ],
            'department' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255|unique:users,email',
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'password' => 'required|string|min:8',
        ]);

        // 1. AMBIL NAMA ROLE SECARA UTUH DAN UBAH JADI HURUF KAPITAL (Tanpa disingkat)
        $roleName = strtoupper(trim($validated['role'])); // Contoh: "MAINTENANCE" atau "ADMIN"

        // 2. GENERATE ANGKA ACAK 3 DIGIT DI BELAKANG (Contoh: 042, 519, 873)
        $randomNumber = str_pad((string) rand(1, 999), 3, '0', STR_PAD_LEFT);

        // 3. SUSUN FORMAT USER CODE (Contoh: USR-MAINTENANCE-482)
        $userCode = "USR-{$roleName}-{$randomNumber}";

        // 4. PENGAMAN: Pastikan benar-benar unik (jika kebetulan angka acaknya kembar)
        while (User::where('user_code', $userCode)->exists()) {
            $randomNumber = str_pad((string) rand(1, 999), 3, '0', STR_PAD_LEFT);
            $userCode = "USR-{$roleName}-{$randomNumber}";
        }

        User::create([
            'user_code' => $userCode,
            'username' => trim($validated['username']),
            'full_name' => trim($validated['full_name']),
            'password' => bcrypt($validated['password']),
            'department' => $validated['department'] ?: null,
            'role' => $roleName,
            'email' => $validated['email'] ?: null,
            'phone_number' => $validated['phone_number'] ?: null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('users.index')
            ->with('success', 'User berhasil ditambahkan!');
    }

    public function edit($id)
    {
        $user = User::findOrFail($id);
        if ($user->hasRole(User::ROLE_ADMIN)) {
            return redirect()->route('users.index')
                ->with('error', 'Akun ADMIN tidak dapat diubah.');
        }

        $roles = Role::select('id', 'name')
            ->whereRaw('UPPER(name) <> ?', [User::ROLE_ADMIN])
            ->get();
        $departments = Department::select('id', 'name')->get();
        return Inertia::render('users/edit', [
            'user' => [
                'id'           => $user->id,
                'user_code'    => $user->user_code,
                'username'     => $user->username,
                'full_name'    => $user->full_name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'role'         => $user->role,
                'department'   => $user->department,
                'is_active'    => (bool) $user->is_active,
            ],
            'roles' => $roles,
            'departments' => $departments,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        if ($user->hasRole(User::ROLE_ADMIN)) {
            return redirect()->route('users.index')
                ->with('error', 'Akun ADMIN tidak dapat diubah.');
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'alpha_dash', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'full_name' => 'required|string|max:255',
            'department' => 'nullable|string|max:100',
            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where(fn ($q) => $q->whereRaw('UPPER(name) <> ?', [User::ROLE_ADMIN])),
            ],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'required|boolean',
            'password' => 'nullable|string|min:8',
        ]);

        $newRole = strtoupper(trim($validated['role']));
        $isActiveNow = (bool) $validated['is_active'];

        $updateData = [
            'username' => trim($validated['username']),
            'full_name' => trim($validated['full_name']),
            'department' => $validated['department'] ?: null,
            'role' => $newRole,
            'email' => $validated['email'] ?: null,
            'phone_number' => $validated['phone_number'] ?: null,
            'is_active' => $isActiveNow,
        ];

        // Jika password diubah, validasi dan hash
        if (!empty($validated['password'])) {
            $updateData['password'] = bcrypt($validated['password']);
        }
        $user->update($updateData);

        return redirect()->route('users.index')
            ->with('success', 'User berhasil diperbarui!');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        if ($user->hasRole(User::ROLE_ADMIN)) {
            return redirect()->back()
                ->with('error', 'Akun ADMIN tidak dapat dihapus.');
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('toast', ['type' => 'success', 'message' => 'User berhasil dihapus!']);
    }

    public function toggleActive(Request $request, User $user)
    {
        $user->is_active = !$user->is_active;
        $user->save();

        return back()->with('toast', [
            'type' => 'success',
            'message' => $user->is_active ? 'User berhasil diaktifkan' : 'User berhasil dinonaktifkan'
        ]);
    }

    /**
     * Khusus Admin mengganti kata sandi akunnya sendiri dari halaman Manajemen User.
     */
    public function updateAdminPassword(Request $request)
    {
        $admin = $request->user();
        if (! $admin || ! $admin->hasRole(User::ROLE_ADMIN)) {
            abort(403, 'Hanya Admin yang dapat mengakses fitur ini.');
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ], [
            'current_password.current_password' => 'Kata sandi lama tidak sesuai.',
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi baru tidak cocok.',
            'password.different' => 'Kata sandi baru harus berbeda dari kata sandi lama.',
        ]);

        $admin->update([
            'password' => bcrypt($validated['password']),
        ]);

        return back()->with('success', 'Kata sandi Admin berhasil diperbarui!');
    }
}
