import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';

interface RoleItem {
    id: number;
    name: string;
}

interface DepartmentItem {
    id: number;
    name: string;
}

interface UserCreateProps{
    roles: RoleItem[];
    departments: DepartmentItem[];
}

export default function UserCreate({ roles = [], departments = [] }: UserCreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        username: '',
        full_name: '',
        email: '',
        role: '',
        department: '',
        phone_number: '',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users/create', {
            onSuccess: () => {
                toast.success('User berhasil ditambahkan!');
            },
            onError: () => {
                toast.error('Gagal menambahkan user!');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Tambah User Baru" />

            <div className="max-w-xl mx-auto space-y-6">
                {/* Header & Back Button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Tambah User Baru</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Daftarkan akun baru dan tentukan hak akses peran dalam sistem.
                        </p>
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
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            {errors.username && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.username}</span>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            {errors.full_name && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.full_name}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="budi@lelco.co.id"
                                required
                            />
                            {errors.email && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.email}</span>}
                        </div>

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

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                            <input
                                type="text"
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            {errors.name && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.name}</span>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="••••••••"
                                required
                            />
                            {errors.password && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.password}</span>}
                        </div>

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
                                {processing ? 'Menyimpan...' : 'Simpan User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}