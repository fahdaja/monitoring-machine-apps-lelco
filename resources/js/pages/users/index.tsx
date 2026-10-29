import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';

interface User {
    id: number;
    user_code?: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
    phone_number: string;
    is_active?: boolean;
}

interface UserIndexProps {
    users?: User[];
    user?: {
        id: number;
        username?: string;
        full_name?: string;
        name?: string;
        email?: string;
        role?: string;
        department?: string;
        phone_number?: string;
    };
}

export default function UserIndex({ users = [], user }: UserIndexProps) {
    const pageProps = usePage().props as any;
    const currentUser = user || pageProps?.auth?.user;
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

    // Pindahkan fungsi handleDelete ke DALAM komponen agar bisa mengakses data user yang diklik
    const handleDelete = (targetUser: User) => {
        // Cek jika user yang mau dihapus adalah ADMIN
        if (targetUser.role?.toUpperCase() === 'ADMIN') {
            toast.error('Gagal Dihapus!', {
                description: 'Akun dengan role ADMIN dilindungi dari penghapusan.',
            });
            return;
        }

        // Konfirmasi sebelum menghapus
        toast.warning('Konfirmasi Hapus', {
            description: `Yakin ingin menghapus user ${targetUser.username}?`,
            action: {
                label: 'Ya, Hapus',
                onClick: () => {
                    // 3. Contoh Penggunaan toast.promise untuk proses asinkronus ke server
                    const deletePromise = new Promise((resolve, reject) => {
                        router.delete(`/users/${targetUser.id}`, {
                            preserveScroll: true,
                            onSuccess: () => resolve(true),
                            onError: () => reject(false),
                        });
                    });

                    toast.promise(deletePromise, {
                        loading: 'Sedang menghapus user dari sistem...',
                        success: 'User berhasil dihapus secara permanen!',
                        error: 'Gagal menghapus user, silakan coba lagi.',
                    });
                },
            },
        });
    };

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
                    {isAdmin && (
                        <Link
                            href="/users/create"
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah User Baru
                        </Link>
                    )}
                </div>

                {/* Table Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-6 text-center">Nama Lengkap</th>
                                    <th className="py-3.5 px-6 text-center">Username</th>
                                    <th className="py-3.5 px-6 text-center">Role</th>
                                    <th className="py-3.5 px-6 text-center">Departemen</th>
                                    <th className="py-3.5 px-6 text-center">Email</th>
                                    <th className="py-3.5 px-6 text-center">No. Telp</th>
                                    <th className="py-3.5 px-6 text-center">Status</th>
                                    <th className="py-3.5 px-6 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                                {users.length > 0 ? (
                                    users.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="text-left">
                                                        <strong className="block font-bold text-slate-800">{item.full_name}</strong>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-[11px] text-slate-700 text-center">
                                                {item.username}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {item.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {item.department || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {item.email || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {item.phone_number || '-'}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                                    item.is_active !== false
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {item.is_active !== false ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/users/${item.id}/edit`}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(item)} // Mengirim seluruh objek 'item' ke fungsi
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
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