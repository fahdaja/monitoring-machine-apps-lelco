import React, { useEffect, useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { AlertCircle, AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, Trash2, Wrench } from 'lucide-react';

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

// Struktur data standar pagination Laravel / Inertia
interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedResponse<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Props {
    forms: PaginatedResponse<FormItem>; // Diubah menjadi PaginatedResponse
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

interface ToastPayload {
    type: 'success' | 'error';
    title: string;
    description: string;
}

export default function FormIndex({ forms }: Props) {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedMachineId, setSelectedMachineId] = useState<number | ''>('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TargetForm | null>(null);
    const [toastMessage, setToastMessage] = useState<ToastPayload | null>(null);

    const machineOptions = Array.from(
    new Map(
        forms.data
            .filter((f) => f.machine)
            .map((f) => [f.machine.id, f.machine])
    ).values()
);

const handleCreateInspection = () => {
    router.get('/forms/create', { category: 'INSPECTION' });
};

const handleCreateManualReport = () => {
    if (!selectedMachineId) return;
    router.get('/forms/create', {
        category: 'MANUAL_REPORT',
        machine_id: selectedMachineId,
    });
};

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
        setIsDeleting(true);
        
        router.delete(`/forms/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setToastMessage({ type: 'success', title: 'Berhasil Dihapus', description: `Template form "${form_title}" berhasil dihapus!` });
                setDeleteTarget(null);
                setIsDeleting(false);
            },
            onError: () => {
                setToastMessage({ type: 'error', title: 'Gagal Menghapus', description: `Gagal menghapus template form "${form_title}".` });
                setDeleteTarget(null);
                setIsDeleting(false);
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
                        <h1 className="text-3xl font-extrabold text-slate-900">Manajemen Template Form</h1>
                        <p className="text-xs text-slate-500 mt-1">Kelola cetak biru (blueprint) pertanyaan inspeksi mesin secara mandiri.</p>
                    </div>
                    {isAdmin && (
    <button
        type="button"
        onClick={() => setCreateModalOpen(true)}
        className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
    >
        + Buat Template Form Baru
    </button>
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
                            {forms.data && forms.data.length > 0 ? (
                                forms.data.map((f) => (
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
                                                <Link
                                                    href={`/forms/${f.id}/edit`} 
                                                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors inline-block shadow-xs"
                                                >
                                                    Edit / Atur
                                                </Link>

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

                    {/* PAGINATION FOOTER */}
                    {forms.links && forms.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50 gap-4">
                            <div className="text-xs text-slate-500">
                                Menampilkan <span className="font-bold text-slate-700">{forms.from || 0}</span> sampai <span className="font-bold text-slate-700">{forms.to || 0}</span> dari <span className="font-bold text-slate-700">{forms.total}</span> data
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5">
                                {forms.links.map((link, idx) => {
                                    // Menangani label teks html dari laravel paginator seperti &laquo; Previous &raquo; Next
                                    const cleanLabel = link.label
                                        .replace('&laquo;', '«')
                                        .replace('&raquo;', '»');

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200"
                                                dangerouslySetInnerHTML={{ __html: cleanLabel }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                                link.active
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: cleanLabel }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {createModalOpen && (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5">
            <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Buat Template Form Baru</h3>
                <p className="text-xs text-slate-500">Pilih jenis form yang ingin kamu buat.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opsi 1: Inspection */}
                <button
                    type="button"
                    onClick={handleCreateInspection}
                    className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                        <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">Form Inspection</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Form berdiri sendiri. Mesin dipilih saat pengisian. Bisa memicu AUTO_REPORT.
                    </p>
                </button>

                {/* Opsi 2: Laporan Breakdown */}
                <button
                    type="button"
                    onClick={() => setSelectedMachineId(selectedMachineId || '')}
                    className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">Form Laporan Breakdown</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Form terikat ke satu mesin. Dibuat dari detail mesin untuk laporan manual.
                    </p>
                </button>
            </div>

            {/* Pilihan mesin — muncul saat opsi manual report dipilih */}
            {selectedMachineId !== '' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700">Pilih Mesin</label>
                    <select
                        value={selectedMachineId}
                        onChange={(e) => setSelectedMachineId(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                    >
                        <option value="">-- Pilih mesin --</option>
                        {machineOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.machine_name ?? m.machine_type} ({m.machine_type})
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={!selectedMachineId}
                        onClick={handleCreateManualReport}
                        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
                    >
                        Lanjut Buat Form Breakdown
                    </button>
                </div>
            )}

            <div className="pt-2">
                <button
                    type="button"
                    onClick={() => {
                        setCreateModalOpen(false);
                        setSelectedMachineId('');
                    }}
                    className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                    Batal
                </button>
            </div>
        </div>
    </div>
)}
        </AppLayout>
    );
}