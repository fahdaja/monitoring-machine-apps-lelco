<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'user_code', 'username', 'email', 'full_name', 'department', 'role', 'phone_number', 'is_active')
            ->orderBy('id', 'asc')
            ->get();

        return Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        $roles = Role::select('id', 'name')->get();
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
            'username' => 'required|string|unique:users,username|max:50',
            'role' => 'required|string',
            'department' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'boolean',
            'password' => 'required|string|min:8|',
        ]);

       // 1. AMBIL NAMA ROLE SECARA UTUH DAN UBAH JADI HURUF KAPITAL (Tanpa disingkat)
    $roleName = strtoupper(trim($validated['role'])); // Contoh: "MAINTENANCE_L2" atau "ADMIN"

    // 2. GENERATE ANGKA ACAK 3 DIGIT DI BELAKANG (Contoh: 042, 519, 873)
    $randomNumber = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);

    // 3. SUSUN FORMAT USER CODE (Contoh: USR-MAINTENANCE_L2-482)
    $userCode = "USR-{$roleName}-{$randomNumber}";

    // 4. PENGAMAN: Pastikan benar-benar unik (jika kebetulan angka acaknya kembar)
    while (User::where('user_code', $userCode)->exists()) {
        $randomNumber = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
        $userCode = "USR-{$roleName}-{$randomNumber}";
    }

        User::create([
            'user_code' => $userCode,
            'username' => $validated['username'],
            'full_name' => $validated['full_name'],
            'password' => bcrypt($validated['password']), // Hash password
            'department' => $validated['department'],
            'role' => $validated['role'],
            'email' => $validated['email'] ?? null,
            'phone_number' => $validated['phone_number'] ?? null,
            'is_active' => true,
        ]);

        return redirect()->route('users.index')
            ->with('toast', ['type' => 'success', 'message' => 'User berhasil ditambahkan!']);
    }

    public function edit($id)
    {
        $user = User::findOrFail($id);
        $roles = Role::select('id', 'name')->get();
        $departments = Department::select('id', 'name')->get();
        return Inertia::render('users/edit', [
            'user' => [
                'id'           => $user->id,
                'username'     => $user->username,
                'full_name'    => $user->full_name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'role'         => $user->role,
                'department'   => $user->department,
                'is_active'    => $user->is_active,
            ],
            'roles' => $roles,
            'departments' => $departments,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $validated = $request->validate([
            'username' => 'nullable|string|max:50',
            'full_name' => 'nullable|string|max:255',
            'department' => 'nullable|string|',
            'role' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
        ]);

        $updateData = [
            'username' => $validated['username'],
            'full_name' => $validated['full_name'] ,
            'department' => $validated['department'],
            'role' => $validated['role'],
            'email' => $validated['email'] ?? null,
            'phone_number' => $validated['phone_number'] ?? null,
        ];

        // Jika password diubah, validasi dan hash
        if(!empty($validated['password'])){
            $updateData['password'] = bcrypt($validated['password']);
        }
        $user->update($updateData);

        return redirect()->route('users.index')
            ->with('toast', ['type' => 'success', 'message' => 'User berhasil diupdate!']);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        if (auth()->id() === $user->id) {
            return redirect()->back()
                ->with('toast', ['type' => 'error', 'message' => 'Anda tidak dapat menghapus akun sendiri!']);
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
}
