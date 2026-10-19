import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';


// Type definitions
interface MachineItem {
    id: number;
    machineId: string;
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


export default function MachineIndex({ machines }: MachineIndexProps) {
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterCriticality, setFilterCriticality] = useState<string>('ALL');

    // Gunakan data dari backend, fallback ke mock data
    const allMachines = machines ?? [];

    // Filter logic
    const filteredMachines = allMachines.filter((m) => {
        const matchSearch =
            search === '' ||
            m.machineName.toLowerCase().includes(search.toLowerCase()) ||
            m.machineId.toLowerCase().includes(search.toLowerCase()) ||
            (m.machineCode && m.machineCode.toLowerCase().includes(search.toLowerCase())) ||
            m.location.toLowerCase().includes(search.toLowerCase()) ||
            (m.department && m.department.toLowerCase().includes(search.toLowerCase()));

        const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
        const matchCriticality = filterCriticality === 'ALL' || m.criticality === filterCriticality;

        return matchSearch && matchStatus && matchCriticality;
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

    const getCriticalityBadge = (criticality: MachineItem['criticality']) => {
        switch (criticality) {
            case 'CRITICAL':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'HIGH':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'MEDIUM':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'LOW':
                return 'bg-slate-50 text-slate-600 border-slate-200';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-200';
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
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Machine Profile
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Daftar seluruh mesin yang terdaftar di sistem digitalisasi pabrik.
                    </p>
                </div>
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
                    value={filterCriticality}
                    onChange={(e) => setFilterCriticality(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900 bg-white min-w-[160px]"
                >
                    <option value="ALL">Semua Criticality</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
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
                                            {m.machineId}
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

                            {/* Criticality + Brand */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCriticalityBadge(m.criticality)}`}>
                                    Criticality: {m.criticality}
                                </span>
                                {m.brand && (
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {m.brand} {m.model ? `· ${m.model}` : ''}
                                    </span>
                                )}
                            </div>

                            {/* Action Button */}
                            <Link
                                href={`/machines/${m.machineId}`}
                                className="block w-full text-center py-2.5 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
                            >
                                Lihat Detail Mesin
                            </Link>
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
        </AppLayout>
    );
}
