import React, { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface RoleItem {
    id: number;
    name: string;
}

interface DepartmentItem {
    id: number;
    name: string;
}

interface UserData {
    id: number;
    user_code: string;
    username: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    role: string;
    department: string | null;
    is_active: boolean;
}

interface UserEditProps {
    user: UserData;
    roles: RoleItem[];
    departments: DepartmentItem[];
}

export default function UserEdit({ user, roles = [], departments = [] }: UserEditProps) {
    const { data, setData, put, processing, errors } = useForm({
        username: user.username || '',
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || '',
        department: user.department || '',
        phone_number: user.phone_number || '',
        password: '', // Dikosongkan, karena opsional saat edit
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        put(`/users/${user.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Edit User - ${user.full_name}`} />

            <div className="max-w-xl mx-auto space-y-6">
                {/* Header & Back Button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Edit Data User</h1>
                    </div>
                    <Link
                        href="/users"
                        className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    >
                        ← Kembali
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: budisantoso"
                                
                            />
                            {errors.username && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.username}</span>}
                        </div>

                        {/* Nama Lengkap */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                
                            />
                            {errors.full_name && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.full_name}</span>}
                        </div>

                        {/* Alamat Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="budi@lelco.co.id"
                            />
                            {errors.email && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.email}</span>}
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                            <select
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                
                            >
                                <option value="">Pilih Role</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {errors.role && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.role}</span>}
                        </div>

                        {/* Departemen */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Departemen</label>
                            <select
                                value={data.department}
                                onChange={(e) => setData('department', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="">Pilih Departemen</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.name}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                            {errors.department && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.department}</span>}
                        </div>

                        {/* Nomor Telepon */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                            <input
                                type="text"
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: 081234567890"
                            />
                            {errors.phone_number && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.phone_number}</span>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Password Baru <span className="text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span>
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="••••••••"
                            />
                            {errors.password && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.password}</span>}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                            <Link
                                href="/users"
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}