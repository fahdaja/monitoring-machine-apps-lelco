import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, CheckCircle2, KeyRound, Loader2, Trash2 } from 'lucide-react';

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

interface TargetUser {
    id: number;
    full_name: string;
    role: string;
}

interface ToastPayload {
    type: 'success' | 'error';
    title: string;
    description?: string;
}

export default function UserIndex({ users = [], user }: UserIndexProps) {
    const pageProps = usePage().props as any;
    const currentUser = user || pageProps?.auth?.user;
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

   // State untuk modal konfirmasi hapus
    const [deleteTarget, setDeleteTarget] = useState<TargetUser | null>(null);
    // State untuk status loading saat proses hapus
    const [isDeleting, setIsDeleting] = useState(false);
    // State untuk toast pesan sukses/gagal di atas
    const [toastMessage, setToastMessage] = useState<ToastPayload | null>(null);
    // Filter role
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const {
        data: pwdData,
        setData: setPwdData,
        put: putPassword,
        processing: pwdProcessing,
        errors: pwdErrors,
        reset: resetPwd,
        clearErrors: clearPwdErrors,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const openPasswordModal = () => {
        resetPwd();
        clearPwdErrors();
        setIsPasswordModalOpen(true);
    };

    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        resetPwd();
        clearPwdErrors();
    };

    const submitAdminPassword = (e: React.FormEvent) => {
        e.preventDefault();
        putPassword('/users/admin/password', {
            preserveScroll: true,
            onSuccess: () => closePasswordModal(),
        });
    };

    const visibleUsers = users.filter((u) => {
        const r = (u.role || '').toUpperCase();
        if (roleFilter === 'ALL') return true;
        return r === roleFilter;
    });

    // Efek otomatis menghilangkan toast pesan setelah 4 detik
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Fungsi klik tombol hapus dengan pengaman role ADMIN
    const handleDeleteClick = (targetUser: User) => {
        if (targetUser.role?.toUpperCase() === 'ADMIN') {
            setToastMessage({
                type: 'error',
                title: 'Aksi Ditolak',
                description: 'Akun dengan role ADMIN dilindungi dari penghapusan.',
            });
            return;
        }

        setDeleteTarget({
            id: targetUser.id,
            full_name: targetUser.full_name || targetUser.username,
            role: targetUser.role,
        });
    };

    // Eksekusi hapus user setelah user klik "Ya, Hapus" di modal tengah
    const confirmDelete = () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        const { id, full_name } = deleteTarget;

        router.delete(`/users/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleting(false);
                setDeleteTarget(null);
                setToastMessage({
                    type: 'success',
                    title: 'Berhasil Dihapus',
                    description: `User "${full_name}" berhasil dihapus dari sistem secara permanen.`,
                });
            },
            onError: () => {
                setIsDeleting(false);
                setDeleteTarget(null);
                setToastMessage({
                    type: 'error',
                    title: 'Gagal Dihapus',
                    description: `Terjadi kesalahan saat menghapus user "${full_name}".`,
                });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Manajemen User" />

            {/* 1. MODAL KONFIRMASI DI TENGAH LAYAR (MUNCUL SAAT KLIK HAPUS USER) */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Ubah Kata Sandi Admin</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Perbarui kata sandi untuk akun Admin yang sedang login ({currentUser?.username}).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closePasswordModal}
                                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={submitAdminPassword} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Lama *</label>
                                <input
                                    type="password"
                                    value={pwdData.current_password}
                                    onChange={(e) => setPwdData('current_password', e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Masukkan kata sandi saat ini"
                                    required
                                />
                                {pwdErrors.current_password && (
                                    <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                        {pwdErrors.current_password}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Baru * (Min. 8 karakter)</label>
                                <input
                                    type="password"
                                    value={pwdData.password}
                                    onChange={(e) => setPwdData('password', e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Minimal 8 karakter"
                                    minLength={8}
                                    required
                                />
                                {pwdErrors.password && (
                                    <span className="text-[10px] text-rose-600 font-bold mt-1 block">
                                        {pwdErrors.password}
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru *</label>
                                <input
                                    type="password"
                                    value={pwdData.password_confirmation}
                                    onChange={(e) => setPwdData('password_confirmation', e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Ulangi kata sandi baru"
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closePasswordModal}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={pwdProcessing}
                                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {pwdProcessing ? 'Menyimpan...' : 'Simpan Sandi Baru'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 1. MODAL KONFIRMASI DI TENGAH LAYAR (MUNCUL SAAT KLIK HAPUS USER) */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 text-center transform transition-all animate-scale-up">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                            <AlertTriangle className="w-7 h-7 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-base font-extrabold text-slate-900">Hapus User Ini?</h3>
                            <p className="text-xs text-slate-500 leading-relaxed px-4">
                                Tindakan ini bersifat permanen. Akun <strong className="text-slate-800">"{deleteTarget.full_name}"</strong> akan dihapus dari sistem secara menyeluruh.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteTarget(null)}
                                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDelete}
                                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Menghapus...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" /> Ya, Hapus
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. TOAST NOTIFIKASI HASIL DI KANAN BAWAH (ALA SONNER - MUNCUL SETELAH AKSI SELESAI) */}
            {toastMessage && (
                <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
                    <div className="pointer-events-auto bg-white text-slate-900 px-4 py-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-start gap-3 w-80 transition-all duration-300 ease-out animate-slide-up">
                        <div className="shrink-0 mt-0.5">
                            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-slate-900">{toastMessage.title}</p>
                            {toastMessage.description && (
                                <p className="text-[11px] text-slate-500 leading-relaxed">{toastMessage.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Manajemen User</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Kelola akun pengguna, hak akses, dan peran dalam sistem monitoring mesin.
                        </p>
                    </div>
                    {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={openPasswordModal}
                                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                            >
                                <KeyRound className="w-4 h-4 text-slate-600" />
                                Ubah Sandi Admin
                            </button>
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
                    )}
                </div>

                {/* Filter Role Chips */}
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { key: 'ALL', label: 'Semua' },
                        { key: 'SUPERVISOR', label: 'Supervisor' },
                        { key: 'OPERATOR', label: 'Operator' },
                        { key: 'MAINTENANCE', label: 'Maintenance' },
                        { key: 'ENGINEERING', label: 'Engineering' },
                        { key: 'VENDOR', label: 'Vendor' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setRoleFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                                roleFilter === tab.key
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Table Section */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
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
                                {visibleUsers.length > 0 ? (
                                    visibleUsers.map((item) => (
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
                                                        onClick={() => handleDeleteClick(item)} // Mengirim seluruh objek 'item' ke fungsi
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