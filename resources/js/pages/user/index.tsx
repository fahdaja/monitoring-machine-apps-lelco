import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function UserIndex({ users = [] }) {
    return (
        <AppLayout>
            <Head title="Manajemen User" />

            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Manajemen User</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Kelola akun pengguna, hak akses, dan peran dalam sistem monitoring mesin.
                        </p>
                    </div>
                    <Link
                        href="/users/create"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah User Baru
                    </Link>
                </div>

                {/* Table Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="grid grid-cols-6 bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider ">
                                    <th className="py-3.5 px-6 text-center">Username</th>
                                    <th className="py-3.5 px-6 text-center">Nama Lengkap</th>
                                    <th className="py-3.5 px-6 text-center">Email</th>
                                    <th className="py-3.5 px-6 text-center">Role</th>
                                    <th className="py-3.5 px-6 text-center">Departemen</th>
                                    <th className="py-3.5 px-6 text-center">No. Telp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center border border-blue-200">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <strong className="block font-bold text-slate-800">{user.name}</strong>
                                                        <span className="text-slate-400 text-[11px]">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Aktif
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/users/${user.id}/edit`}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                                                    >
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-400">
                                            Belum ada data user yang terdaftar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}