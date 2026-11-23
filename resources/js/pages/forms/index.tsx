import React, { useEffect, useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    Loader2,
    Trash2,
    Wrench,
    Lock,
    FileText,
    CheckCircle,
    PlayCircle, // icon buat start repair
} from 'lucide-react';

interface Machine {
    id: number;
    machine_name?: string;
    machine_type: string;
}

// Opsi mesin untuk modal buat form (diambil dari daftar mesin terdaftar)
interface MachineOption {
    id: number;
    machine_code?: string;
    machine_name?: string;
    machine_type?: string;
    location?: string | null;
}

// 1. TAMBAHIN form_type & pipeline_stage (opsional)
interface FormItem {
    id: number;
    form_code: string;
    form_title: string;
    form_description?: string;
    form_type: 'INSPECTION' | 'MANUAL_REPORT' | 'START_REPAIR' | 'CLOSE_TICKET'; 
    machine?: Machine; // jadi optional, karena form transisi gak butuh mesin
    pipeline_stage?: string; // misal: "Corrective - Stage Report"
    created_at?: string;
    updated_at?: string;
    is_editable?: boolean;
}

// ... (interface Pagination, Props, dll tetap sama)
interface PaginationLink { url: string | null; label: string; active: boolean; }
interface PaginatedResponse<T> { data: T[]; links: PaginationLink[]; current_page: number; last_page: number; from: number; to: number; total: number; }
interface Props {
    forms: PaginatedResponse<FormItem>;
    filters?: { type?: string | null };
    typeCounts?: Record<string, number>;
    machines?: MachineOption[];
    flash?: { success?: string; error?: string };
}
interface User { id: number; full_name: string; role: string; }
interface PageProps { auth: { user: User }; flash?: { success?: string; error?: string }; [key: string]: any; }
interface TargetForm { id: number; form_title: string; }
interface ToastPayload { type: 'success' | 'error'; title: string; description: string; }

// Helper buat render badge warna
const renderFormTypeBadge = (type: string) => {
    switch (type) {
        case 'INSPECTION':
            return <span className="bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider">INSPECTION</span>;
        case 'MANUAL_REPORT':
            return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider">MANUAL REPORT</span>;
        case 'START_REPAIR':
            return <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider">START REPAIR</span>;
        case 'CLOSE_TICKET':
            return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider">CLOSE TICKET</span>;
        default:
            return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">UNKNOWN</span>;
    }
};

const FORM_TYPE_TABS: { key: string | null; label: string }[] = [
    { key: null, label: 'Semua' },
    { key: 'INSPECTION', label: 'Inspection' },
    { key: 'MANUAL_REPORT', label: 'Laporan Breakdown' },
    { key: 'START_REPAIR', label: 'Mulai Repair' },
    { key: 'CLOSE_TICKET', label: 'Tutup Tiket' },
];

export default function FormIndex({ forms, filters, typeCounts, machines = [] }: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    const [createModalOpen, setCreateModalOpen] = useState(false);
    
    // State buat milih tipe form di modal
    const [selectedFormType, setSelectedFormType] = useState<string | null>(null);
    const [selectedMachineId, setSelectedMachineId] = useState<number | ''>('');

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TargetForm | null>(null);
    const [toastMessage, setToastMessage] = useState<ToastPayload | null>(null);

    // Semua mesin terdaftar bisa dipilih, tidak perlu menunggu mesin punya form inspeksi
    const machineOptions: MachineOption[] = machines;

    // Handlers Modal Create
    const handleCreateInspection = () => {
        router.get('/forms/create', { category: 'INSPECTION' });
    };

    const handleCreateManualReport = () => {
        router.get('/forms/create', { category: 'MANUAL_REPORT' });
    };

    const handleCreateTransitionForm = (type: 'START_REPAIR' | 'CLOSE_TICKET') => {
        router.get('/forms/create', { category: type });
    };

    // ... (useEffect Toast, useEffect Auto-hide, confirmDelete, formatDate tetap sama)
    useEffect(() => {
        if (flash?.success) setToastMessage({ type: 'success', title: 'Berhasil', description: flash.success });
        else if (flash?.error) setToastMessage({ type: 'error', title: 'Gagal', description: flash.error });
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
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
            onError: (errors) => {
                const msg = (errors as any)?.error || `Gagal menghapus template form "${form_title}".`;
                setToastMessage({ type: 'error', title: 'Gagal Menghapus', description: msg });
                setDeleteTarget(null);
                setIsDeleting(false);
            },
        });
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <AppLayout>
            <Head title="Manajemen Template Form" />

            {/* ... (Toast & Modal Hapus tetap sama) */}
             {toastMessage && (
                <div className="fixed z-50 pointer-events-none bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 flex flex-col items-end">
                    <div className="pointer-events-auto bg-white text-slate-900 px-4 py-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-start gap-3 w-full sm:w-80 max-w-full">
                        <div className="shrink-0 mt-0.5">
                            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900">{toastMessage.title}</p>
                            {toastMessage.description && <p className="text-[11px] text-slate-500 break-words">{toastMessage.description}</p>}
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-5 text-center max-h-[90dvh] overflow-y-auto">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus</h3>
                            <p className="text-xs text-slate-500 leading-relaxed px-2 sm:px-4 break-words">{deleteTarget.form_title}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
                            <button type="button" disabled={isDeleting} onClick={() => setDeleteTarget(null)} className="w-full py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">Batal</button>
                            <button type="button" disabled={isDeleting} onClick={confirmDelete} className="w-full py-2.5 sm:py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                                {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : <><Trash2 className="w-4 h-4" /> Ya, Hapus</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4 sm:space-y-6">
                {/* HEADER HALAMAN */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900">Manajemen Template Form</h1>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Kelola seluruh form sistem (Inspeksi, Manual, & Transisi Kanban).</p>
                    </div>
                    {isAdmin && (
                        <button type="button" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0">
                            + Buat Template Form Baru
                        </button>
                    )}
                </div>

                {/* FILTER KATEGORI FORM */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {FORM_TYPE_TABS.map((tab) => {
                        const isActive = (filters?.type ?? null) === tab.key;
                        const count = tab.key ? (typeCounts?.[tab.key] ?? 0) : forms.total;

                        return (
                            <Link
                                key={tab.key ?? 'ALL'}
                                href={tab.key ? `/forms?type=${tab.key}` : '/forms'}
                                preserveScroll
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* TABEL */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        {/* UBAH MIN-WIDTH JADI LEBIH LEBAR KARENA ADA KOLOM BARU */}
                        <table className="w-full min-w-[900px] text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <th className="p-3 sm:p-4 font-extrabold">Judul Template Form</th>
                                    <th className="p-3 sm:p-4 text-center font-extrabold">Tipe Form</th>
                                    <th className="p-3 sm:p-4 text-center font-extrabold">Digunakan Untuk</th>
                                    <th className="p-3 sm:p-4 text-center font-extrabold whitespace-nowrap">Tgl Dibuat</th>
                                    <th className="p-3 sm:p-4 text-center font-extrabold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {forms.data && forms.data.length > 0 ? (
                                    forms.data.map((f) => (
                                        <tr key={f.id} className='hover:bg-slate-50'>
                                            <td className="p-3 sm:p-4">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 break-words">{f.form_title}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{f.form_code}</div>
                                                </div>
                                            </td>
                                            {/* KOLOM TIPE FORM (BADGE) */}
                                            <td className="p-3 sm:p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {renderFormTypeBadge(f.form_type)}
                                                </div>
                                            </td>
                                            {/* KOLOM DIGUNAKAN UNTUK (MESIN / PIPELINE) */}
                                            <td className="p-3 sm:p-4 text-center text-slate-600">
                                                {f.machine ? (
                                                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap">
                                                        {f.machine.machine_name ?? f.machine.machine_type}
                                                    </span>
                                                ) : f.pipeline_stage ? (
                                                    <span className="text-slate-700 font-medium whitespace-nowrap">
                                                        {f.pipeline_stage}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Semua Mesin</span>
                                                )}
                                            </td>
                                            <td className="p-3 sm:p-4 text-center text-slate-500 font-medium whitespace-nowrap">
                                                {formatDate(f.created_at)}
                                            </td>
                                            <td className="p-3 sm:p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
                                                    {isAdmin && (
                                                        <>
                                                            <Link href={`/forms/${f.id}/edit`} className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors inline-block shadow-xs">Edit / Atur</Link>
                                                            <button type="button" onClick={() => setDeleteTarget({ id: f.id, form_title: f.form_title })} className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold hover:bg-rose-100 transition-colors cursor-pointer">Hapus</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">Belum ada template form yang tersedia. Silakan buat baru.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {forms.links && forms.links.length > 3 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50 gap-3 sm:gap-4">
                            <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
                                Menampilkan <span className="font-bold text-slate-700">{forms.from || 0}</span> sampai <span className="font-bold text-slate-700">{forms.to || 0}</span> dari <span className="font-bold text-slate-700">{forms.total}</span> data
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {forms.links.map((link, idx) => {
                                    const cleanLabel = link.label.replace('&laquo;', '«').replace('&raquo;', '»');
                                    if (!link.url) return <span key={idx} className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed border border-slate-200" dangerouslySetInnerHTML={{ __html: cleanLabel }} />;
                                    return <Link key={idx} href={link.url} preserveScroll className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${link.active ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`} dangerouslySetInnerHTML={{ __html: cleanLabel }} />;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ============ MODAL CREATE (DI-UPGRADE) ============ */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-5 max-h-[90dvh] overflow-y-auto">
                        <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-slate-900">Buat Template Form Baru</h3>
                            <p className="text-xs text-slate-500">Pilih jenis form yang ingin kamu buat.</p>
                        </div>

                        {/* Grid 2x2 untuk 4 Pilihan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1. Inspection */}
                            <button
                                type="button"
                                onClick={handleCreateInspection}
                                className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-extrabold text-slate-900">Form Inspection</p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Form berdiri sendiri. Mesin dipilih saat pengisian. Bisa memicu AUTO_REPORT.</p>
                            </button>

                            {/* 2. Manual Report */}
                            <button
                                type="button"
                                onClick={handleCreateManualReport}
                                className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <Wrench className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-extrabold text-slate-900">Form Laporan Breakdown</p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Form template untuk pelaporan kerusakan mesin.</p>
                            </button>

                            {/* 3. Start Repair */}
                            <button
                                type="button"
                                onClick={() => handleCreateTransitionForm('START_REPAIR')}
                                className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                    <PlayCircle className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-extrabold text-slate-900">Form Mulai Repair</p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Muncul saat tiket dipindah dari stage Report ke Repair di Kanban Board.</p>
                            </button>

                            {/* 4. Close Ticket */}
                            <button
                                type="button"
                                onClick={() => handleCreateTransitionForm('CLOSE_TICKET')}
                                className="group text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-extrabold text-slate-900">Form Tutup Tiket</p>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Muncul saat tiket akan di-close / diverifikasi selesai oleh teknisi.</p>
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setCreateModalOpen(false);
                                    setSelectedFormType(null);
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