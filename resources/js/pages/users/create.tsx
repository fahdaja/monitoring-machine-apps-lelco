import React from 'react';
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

interface UserCreateProps {
    roles: RoleItem[];
    departments: DepartmentItem[];
}

export default function UserCreate({ roles = [], departments = [] }: UserCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        full_name: '',
        email: '',
        role: '',
        department: '',
        phone_number: '',
        is_active: true,
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users/create');
    };

    return (
        <AppLayout>
            <Head title="Tambah User Baru" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header & Back Button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Tambah User Baru</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Daftarkan akun baru dan tentukan hak akses peran dalam sistem.
                        </p>
                    </div>
                    <Link
                        href="/users"
                        className="px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    >
                        ← Kembali
                    </Link>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Username *</label>
                                <input
                                    type="text"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Contoh: budisantoso"
                                    required
                                />
                                {errors.username && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.username}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Contoh: Budi Santoso"
                                    required
                                />
                                {errors.full_name && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.full_name}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Role *</label>
                                <select
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                    required
                                >
                                    <option value="">-- Pilih Role --</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.role}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Departemen</label>
                                <select
                                    value={data.department}
                                    onChange={(e) => setData('department', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                >
                                    <option value="">-- Pilih Departemen --</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.name}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.department && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.department}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Alamat Email</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Contoh: budi@lelco.co.id"
                                />
                                {errors.email && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.email}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nomor Telepon</label>
                                <input
                                    type="tel"
                                    value={data.phone_number}
                                    onChange={(e) => setData('phone_number', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Contoh: 081234567890"
                                />
                                {errors.phone_number && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.phone_number}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Password * (Min. 8 karakter)</label>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Minimal 8 karakter"
                                    minLength={8}
                                    required
                                />
                                {errors.password && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.password}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Status Akun</label>
                                <select
                                    value={data.is_active ? '1' : '0'}
                                    onChange={(e) => setData('is_active', e.target.value === '1')}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                                >
                                    <option value="1">Aktif</option>
                                    <option value="0">Nonaktif</option>
                                </select>
                                {errors.is_active && <span className="text-xs text-rose-500 font-semibold mt-1 block">{errors.is_active}</span>}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                            <Link
                                href="/users"
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
