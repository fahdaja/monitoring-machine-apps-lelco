import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function UserCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        role: 'Operator',
        departemen: '',
        phone: '',
        password: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/users/create');
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
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            {errors.name && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.name}</span>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="Contoh: Budi Santoso"
                                required
                            />
                            {errors.name && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.name}</span>}
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
                                <option value="Supervisor">Supervisor</option>
                                <option value="Operator">Operator</option>
                                <option value="Maintenance_L2">Maintenance_L2</option>
                                <option value="Engineering_L3">Engineering_L3</option>
                                <option value="Vendor_L4">Vendor_L4</option>
                            </select>
                            {errors.role && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.role}</span>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Departemen</label>
                            <select
                                value={data.departemen}
                                onChange={(e) => setData('departemen', e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="">Pilih Departemen</option>
                                <option value="Produksi">Produksi</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Quality">Quality</option>
                                <option value="Logistik">Logistik</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Vendor">Vendor</option>
                            </select>
                            {errors.departemen && <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.departemen}</span>}
                        </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Telepon</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
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