import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Edit3, Trash2, Eye, AlertTriangle, X } from 'lucide-react';

interface User {
    id: number;
    full_name: string;
    role: string;
}

// Type definitions
interface MachineItem {
    id: number;
    machineCode?: string;
    machineName: string;
    category: string;
    machineType: string;
    subType?: string;
    brand?: string;
    model?: string;
    department?: string;
    area?: string;
    location: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'RUNNING' | 'DOWN' | 'UNDER_REPAIR' | 'WAITING_SPAREPART' | 'WAITING_L3' | 'WAITING_VENDOR' | 'WAITING_VERIFICATION' | 'PLANNED_MAINTENANCE' | 'INACTIVE';
    activeStatus: boolean;
}

interface MachineIndexProps {
    machines?: MachineItem[];
}

interface pageProps {
    auth: {
        user: User
    }
    [key: string]: any;
}


export default function MachineIndex({ machines }: MachineIndexProps) {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterMachineType, setFilterMachineType] = useState<string>('ALL');
    const [deleteTarget, setDeleteTarget] = useState<MachineItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        router.delete(`/machines/${deleteTarget.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const { auth } = usePage<pageProps>().props;

    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    // Gunakan data dari backend, fallback ke mock data
    const allMachines = machines ?? [];

    // Filter logic
    const filteredMachines = allMachines.filter((m) => {
        const matchSearch =
            search === '' ||
            m.machineName.toLowerCase().includes(search.toLowerCase()) ||
            (m.machineCode && m.machineCode.toLowerCase().includes(search.toLowerCase())) ||
            m.location.toLowerCase().includes(search.toLowerCase()) ||
            (m.department && m.department.toLowerCase().includes(search.toLowerCase()));

        const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
        const matchMachineType = filterMachineType === 'ALL' || m.machineType === filterMachineType;

        return matchSearch && matchStatus && matchMachineType;
    });

    // Badge helpers
    const getStatusBadge = (status: MachineItem['status']) => {
        switch (status) {
            case 'DOWN':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'RUNNING':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'UNDER_REPAIR':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'WAITING_SPAREPART':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'WAITING_L3':
                return 'bg-pink-100 text-pink-800 border-pink-200';
            case 'WAITING_VENDOR':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'WAITING_VERIFICATION':
                return 'bg-teal-100 text-teal-800 border-teal-200';
            case 'PLANNED_MAINTENANCE':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'INACTIVE':
                return 'bg-slate-200 text-slate-700 border-slate-300';
        }
    };


    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'RUNNING': return 'Running';
            case 'DOWN': return 'Down';
            case 'UNDER_REPAIR': return 'Under Repair';
            case 'WAITING_SPAREPART': return 'Waiting Sparepart';
            case 'WAITING_L3': return 'Waiting L3';
            case 'WAITING_VENDOR': return 'Waiting Vendor';
            case 'WAITING_VERIFICATION': return 'Waiting Verification';
            case 'PLANNED_MAINTENANCE': return 'Planned Maintenance';
            case 'INACTIVE': return 'Inactive';
            default: return status;
        }
    };

    // Summary counts
    const statusCounts = {
        ALL: allMachines.length,
        RUNNING: allMachines.filter(m => m.status === 'RUNNING').length,
        DOWN: allMachines.filter(m => m.status === 'DOWN').length,
        UNDER_REPAIR: allMachines.filter(m => m.status === 'UNDER_REPAIR').length,
        WAITING_SPAREPART: allMachines.filter(m => m.status === 'WAITING_SPAREPART').length,
        WAITING_L3: allMachines.filter(m => m.status === 'WAITING_L3').length,
        WAITING_VENDOR: allMachines.filter(m => m.status === 'WAITING_VENDOR').length,
        WAITING_VERIFICATION: allMachines.filter(m => m.status === 'WAITING_VERIFICATION').length,
        PLANNED_MAINTENANCE: allMachines.filter(m => m.status === 'PLANNED_MAINTENANCE').length,
        INACTIVE: allMachines.filter(m => m.status === 'INACTIVE').length,
    };

    return (
        <AppLayout>
            <Head title="Machine Profile - Daftar Mesin" />

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    {isAdmin ? (
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Manajemen Mesin
                        </h1>
                    ) : (
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Machine Profile
                        </h1>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                        {isAdmin ? 'Daftar seluruh mesin yang terdaftar di sistem digitalisasi pabrik.' : 'Informasi lengkap mengenai mesin yang menjadi aset operasional perusahaan.'}
                    </p>
                </div>
                {isAdmin ? (
                <Link
                    href="/machines/create"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Mesin Baru
                </Link>
                ) : null}




            </div>

            {/* Status Summary Chips */}
            <div className="flex flex-wrap gap-2 mb-5">
                {(Object.entries(statusCounts) as [string, number][]).map(([key, count]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilterStatus(key)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all
                            ${filterStatus === key
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                    >
                        {key === 'ALL' ? 'Semua' : getStatusLabel(key)}
                        <span className={`inline-grid place-items-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black
                            ${filterStatus === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama mesin, kode, lokasi, atau departemen..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 bg-white transition-all"
                    />
                </div>
                <select
                    value={filterMachineType}
                    onChange={(e) => setFilterMachineType(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900 bg-white min-w-[160px]"
                >
                    <option value="ALL">Semua Tipe Mesin</option>
                    <option value="HYDRAULIC PRESS">Hydraulic Press</option>
                    <option value="CNC LATHE">CNC Lathe</option>
                    <option value="BAND SAW">Band Saw</option>
                    <option value="CHAIN HOIST">Chain Hoist</option>
                    <option value="AIR COMPRESSOR">Air Compressor</option>
                </select>
            </div>

            {/* Machine Cards Grid */}
            {filteredMachines.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMachines.map((m) => (
                        <div
                            key={m.id}
                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                        >
                            {/* Header: ID + Status */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {m.id}
                                        </span>
                                        {m.machineCode && (
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {m.machineCode}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-slate-800 transition-colors">
                                        {m.machineName}
                                    </h3>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getStatusBadge(m.status)}`}>
                                    {getStatusLabel(m.status)}
                                </span>
                            </div>

                            {/* Info Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-3 text-[11px] text-slate-600">
                                <span className="bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-md">
                                    {m.category}
                                </span>
                                <span className="bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-md">
                                    {m.machineType}
                                </span>
                                {m.subType && (
                                    <span className="bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-md">
                                        {m.subType}
                                    </span>
                                )}
                            </div>

                            {/* Location & Department */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
                                <span className="inline-flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {m.location}
                                </span>
                                {m.department && (
                                    <span className="inline-flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        {m.department}
                                    </span>
                                )}
                            </div>


                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                <Link
                                    href={`/machines/${m.id}`}
                                    className="flex-1 text-center py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs inline-flex items-center justify-center gap-1.5"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Detail</span>
                                </Link>
                                {isAdmin && (
                                    <>
                                    <Link
                                    href={`/machines/${m.id}/edit`}
                                    className="py-2 px-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-xs inline-flex items-center justify-center gap-1"
                                    title="Edit Data Mesin"
                                >
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit</span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(m)}
                                    className="py-2 px-3 text-xs font-bold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shadow-xs inline-flex items-center justify-center gap-1 cursor-pointer"
                                    title="Hapus Mesin"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Hapus</span>
                                </button>
                                    </>
                                )}    
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-bold text-slate-700 mb-1">Tidak ada mesin ditemukan</p>
                    <p className="text-xs text-slate-400">Coba ubah filter atau kata kunci pencarian.</p>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS */}
            {deleteTarget && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center relative text-center">
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">Hapus Data Mesin?</h3>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            Apakah Anda yakin ingin menghapus mesin <span className="font-bold text-slate-800">{deleteTarget.machineName}</span> ({deleteTarget.machineCode || deleteTarget.id})? Data yang sudah dihapus tidak dapat dipulihkan.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteTarget(null)}
                                className="py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDelete}
                                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Mesin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
