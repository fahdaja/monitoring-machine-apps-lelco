<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\User;

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
        return Inertia::render('users/create', [
            'departments' => [
                'HRD', 
                'Finance', 
                'Production',
                'Quality',
                'Maintenance',
                'Engineering',
                'Purchasing'
            ],
            'roles' => ['admin', 'user', 'guest']
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|unique:users,username|max:50',
            'full_name' => 'required|string|max:255',
            'password' => 'required|string|min:8|confirmed',
            'department' => 'nullable|string|max:100',
            'role' => 'required|string|in:admin,user,guest',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
        ]);

        // Generate ID unik untuk user
        $userId = 'USER-' . strtoupper(uniqid());

        User::create([
            'user_id' => $userId,
            'username' => $validated['username'],
            'full_name' => $validated['full_name'],
            'password' => bcrypt($validated['password']), // Hash password
            'department' => $validated['department'],
            'role' => $validated['role'],
            'email' => $validated['email'] ?? null,
            'phone_number' => $validated['phone_number'] ?? null,
            'is_active' => true,
        ]);

        return redirect()->route('management-users.index')
            ->with('toast', ['type' => 'success', 'message' => 'User berhasil ditambahkan!']);
    }

    public function edit(User $user)
    {
        return Inertia::render('user/edit', [
            'user' => $user,
            'departments' => ['HRD', 'Finance', 'Production', 'Quality', 'Maintenance', 'Engineering', 'Purchasing'],
            'roles' => ['admin', 'user', 'guest'],
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'department' => 'nullable|string|max:100',
            'role' => 'required|string|in:admin,user,guest',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        // Jika password diubah, validasi dan hash
        if ($request->password) {
            $request->validate([
                'password' => 'required|string|min:8|confirmed',
            ]);
            $validated['password'] = bcrypt($request->password);
        }

        $user->update($validated);

        return redirect()->route('management-users.index')
            ->with('toast', ['type' => 'success', 'message' => 'User berhasil diupdate!']);
    }

    public function destroy(User $user)
    {
        // Jangan hapus admin
        if ($user->username === 'admin') {
            return back()->with('toast', ['type' => 'error', 'message' => 'Admin tidak bisa dihapus!']);
        }

        $user->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'User berhasil dihapus!']);
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
