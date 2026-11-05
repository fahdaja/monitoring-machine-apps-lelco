import React, { useEffect, useState } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Machine {
    id: number;
    machine_name?: string;
    machine_type: string;
}

interface FormItem {
    id: number;
    form_code: string;
    form_title: string;
    form_description?: string;
    machine: Machine;
    responder?: string;
    sections_count?: number;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    forms: FormItem[];
}

interface User {
    id: number;
    full_name: string;
    role: string;
}

interface PageProps {
    auth: {
        user: User;
    };
    [key: string]: any;
}

interface TargetForm {
    id: number;
    form_title: string;
}

interface ToastPayload{
    type: 'success' | 'error'
    title: string;
    description: string;
}

export default function FormIndex({ forms }: Props) {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    
const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TargetForm | null>(null);
   const [toastMessage, setToastMessage] = useState<ToastPayload | null>(null);

    // Efek otomatis menghilangkan toast setelah 4 detik
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

const confirmDelete = () => {
    if (!deleteTarget) return;

    const { id, form_title } = deleteTarget;
    
    router.delete(`/forms/${id}`, {
        preserveScroll: true,
        onSuccess: () => {
            setToastMessage({ type: 'success', title: 'Berhasil Dihapus', description: `Template form "${form_title}" berhasil dihapus!` });
            setDeleteTarget(null);
        },
        onError: () => {
            setToastMessage({ type: 'error', title: 'Gagal Menghapus', description: `Gagal menghapus template form "${form_title}".` });
            setDeleteTarget(null);
        }
    });
};

    // Helper format tanggal
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AppLayout>
            <Head title="Manajemen Template Form" />

{/* TOAST NOTIFIKASI */}
            {toastMessage && (
                <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
                    <div className="pointer-events-auto bg-white text-slate-900 px-4 py-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-start gap-3 w-80">
                        <div className="shrink-0 mt-0.5">
                            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-slate-900">{toastMessage.title}</p>
                            {toastMessage.description && <p className="text-[11px] text-slate-500">{toastMessage.description}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 text-center">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus</h3>
                            <p className="text-xs text-slate-500 leading-relaxed px-4">{deleteTarget.form_title}</p>
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
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Manajemen Template Form</h1>
                        <p className="text-xs text-slate-500 mt-1">Kelola cetak biru (blueprint) pertanyaan inspeksi mesin secara mandiri.</p>
                    </div>
                    {isAdmin && (
                        <Link
                            href="/forms/create"
                            className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
                        >
                            + Buat Template Form Baru
                        </Link>
                    )}
                </div>

                {/* Tabel Daftar Template Form */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-4 font-extrabold">Judul Template Form</th>
                                <th className="p-4 text-center font-extrabold">Mesin Terikat</th>
                                <th className="p-4 text-center font-extrabold">Responden</th>
                                <th className="p-4 text-center font-extrabold">Tanggal Dibuat</th>
                                <th className="p-4 text-center font-extrabold">Tanggal Diupdate</th>
                                <th className="p-4 text-center font-extrabold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {forms && forms.length > 0 ? (
                                forms.map((f) => (
                                    <tr key={f.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{f.form_title}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{f.form_code}</div>
                                        </td>
                                        <td className="text-center p-4 text-slate-600">
                                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">
                                                {f.machine?.machine_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-medium text-slate-700">
                                            <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg">
                                                {f.responder || 'Teknisi / Operator'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(f.created_at)}
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(f.updated_at)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Tombol Atur / Edit Pertanyaan */}
                                                <Link
                                                    href={`/forms/${f.id}/edit`} 
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors inline-block shadow-xs"
                                                >
                                                    Edit / Atur
                                                </Link>

                                                {/* Tombol Hapus Form */}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget({ id: f.id, form_title: f.form_title })}
                                                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                                                    >
                                                        Hapus
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">Belum ada template form yang tersedia. Silakan buat baru.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}