import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../layouts/app-layout';

// Type definitions sederhana untuk props
interface MachineTask {
    taskId: string;
    machineId: string;
    machineName: string;
    activity: string;
    level: string;
    scheduledDate: string;
    location: string;
    status: 'DUE' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED';
}

export default function Dashboard({ 
    summary, 
    myMachines, 
    myInspectionTasks, 
    myProblems, 
    breakdowns, 
    statusCounts, 
    syncedAt 
}: any) {
    // Format KPI Grid Data
    const kpiCards = [
        { label: 'Total Mesin', value: summary?.totalMachines ?? 0, sub: 'Scope Anda' },
        { label: 'Running', value: summary?.running ?? 0, sub: 'Saat ini' },
        { label: 'Down', value: summary?.down ?? 0, sub: 'Breakdown' },
        { label: 'Under Repair', value: summary?.underRepair ?? 0, sub: 'Corrective' },
        { label: 'Open Breakdown', value: summary?.openBreakdown ?? 0, sub: 'Ticket aktif' },
        { label: 'Inspection Due', value: summary?.inspectionDueToday ?? 0, sub: 'Hari ini' },
        { label: 'Overdue', value: summary?.inspectionOverdue ?? 0, sub: 'Preventive' },
        { label: 'Completed', value: summary?.inspectionCompletedToday ?? 0, sub: 'Hari ini' },
    ];

    // Helper Badge Color berdasarkan status
    const getBadgeClass = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING':
            case 'COMPLETED':
            case 'CLOSED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'DOWN':
            case 'OVERDUE':
            case 'CRITICAL':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'UNDER_REPAIR':
            case 'IN_REPAIR':
            case 'IN_PROGRESS':
            case 'DUE':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'UPCOMING':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const formatDowntime = (minutes: any) => {
        const m = Number(minutes || 0);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        return `${h}j ${r}m`;
    };

    return (
        <AppLayout>
            <Head title="Dashboard" />

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Monitoring kondisi mesin, preventive inspection, dan machine breakdown.
                    </p>
                </div>
                <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Terakhir disinkronkan: {syncedAt || 'Baru saja'}
                    </span>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                {kpiCards.map((card, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{card.label}</span>
                        <span className="text-2xl font-black text-slate-900 mt-1 block tracking-tight">{card.value}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">{card.sub}</span>
                    </div>
                ))}
            </div>

            {/* Section: Mesin Saya */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Mesin Saya</h2>
                        <p className="text-xs text-slate-500">Mesin yang menjadi tanggung jawab Anda berdasarkan assignment.</p>
                    </div>
                    <Link href="/machines" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                        Lihat Semua Mesin &rarr;
                    </Link>
                </div>

                {myMachines && myMachines.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myMachines.map((m: any) => (
                            <div key={m.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                        {m.responsibilityType}
                                    </span>
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeClass(m.status)}`}>
                                        {m.status}
                                    </span>
                                </div>
                                <h3 className="font-extrabold text-slate-900 text-base leading-snug">{m.machineName}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{m.machineId}</p>

                                <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] text-slate-600">
                                    <span className="bg-white px-2 py-0.5 border border-slate-200 rounded-md">{m.machineType || '-'}</span>
                                    <span className="bg-white px-2 py-0.5 border border-slate-200 rounded-md">{m.location || '-'}</span>
                                </div>

                                {m.assignmentNote && (
                                    <p className="text-xs text-slate-500 italic mt-2.5 line-clamp-2">{m.assignmentNote}</p>
                                )}

                                <div className="mt-4">
                                    <Link
                                        href={`/machines/${m.machineId}`}
                                        className="block w-full text-center py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Lihat Profil Mesin
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm">
                        Belum ada assignment mesin untuk akun Anda.
                    </div>
                )}
            </div>

            {/* Grid 2 Kolom: Inspection Mesin Saya & Problem Mesin Saya */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                
                {/* 1. SECTION: Inspection Mesin Saya (PREVENTIVE TASKS) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Inspection Mesin Saya</h2>
                            <p className="text-xs text-slate-500">Task preventive aktif untuk mesin assignment Anda.</p>
                        </div>
                        <Link href="/tasks" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            Lihat Kalender &rarr;
                        </Link>
                    </div>

                    {myInspectionTasks && myInspectionTasks.length > 0 ? (
                        <div className="space-y-3">
                            {myInspectionTasks.map((t: MachineTask) => (
                                <div 
                                    key={t.taskId} 
                                    className={`p-3.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/80 transition-colors border-l-4 ${
                                        t.status === 'OVERDUE' ? 'border-l-rose-500' :
                                        t.status === 'DUE' ? 'border-l-amber-500' :
                                        t.status === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-blue-500'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-grid place-items-center min-w-[28px] h-5 px-1.5 bg-slate-100 text-slate-900 text-[10px] font-black rounded">
                                                    {t.level || 'L1'}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(t.status)}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{t.activity}</h4>
                                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                                                {t.machineName} <span className="text-slate-400 font-mono text-[11px]">({t.machineId})</span>
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Jadwal: {t.scheduledDate} &bull; {t.location}
                                            </p>
                                        </div>

                                        {['DUE', 'OVERDUE'].includes(t.status) && (
                                            <Link
                                                href={`/tasks/${t.taskId}`}
                                                className="shrink-0 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap self-center"
                                            >
                                                Mulai
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                            Tidak ada task preventive inspection aktif saat ini.
                        </div>
                    )}
                </div>

                {/* 2. SECTION: Problem Mesin Saya */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Problem Mesin Saya</h2>
                            <p className="text-xs text-slate-500">Breakdown aktif pada mesin tanggung jawab Anda.</p>
                        </div>
                        <Link href="/breakdowns" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                            Lihat Pipeline &rarr;
                        </Link>
                    </div>

                    {myProblems && myProblems.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {myProblems.map((prob: any) => (
                                <div key={prob.id} className="py-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{prob.machineName}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                            <span className="font-mono text-slate-700 font-semibold mr-1.5">{prob.ticketId}</span>
                                            {prob.problem}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(prob.status)}`}>
                                        {prob.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                            Tidak ada breakdown aktif pada mesin Anda.
                        </div>
                    )}
                </div>

            </div>

            {/* Grid 2 Kolom: Breakdown System Aktif & Ringkasan Status Mesin */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Breakdown Aktif System */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Breakdown System Aktif</h2>
                            <p className="text-xs text-slate-500">Seluruh laporan breakdown terbaru di pabrik.</p>
                        </div>
                        <Link href="/breakdowns" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                            Lihat Semua &rarr;
                        </Link>
                    </div>

                    {breakdowns && breakdowns.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {breakdowns.map((b: any) => (
                                <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{b.machineName}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            <span className="font-mono text-slate-700 mr-1.5">{b.ticketId}</span>
                                            {b.problem}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(b.status)}`}>
                                            {b.status}
                                        </span>
                                        <span className="block text-[10px] text-slate-400 font-mono mt-1">
                                            {formatDowntime(b.breakdownMinutes)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                            Tidak ada breakdown aktif saat ini.
                        </div>
                    )}
                </div>

                {/* Ringkasan Distribusi Status Mesin */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-3">Ringkasan Status Mesin</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {statusCounts && Object.keys(statusCounts).length > 0 ? (
                            Object.entries(statusCounts).map(([status, count]) => (
                                <div key={status} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50/50">
                                    <span className="text-xs font-bold text-slate-700">{status}</span>
                                    <span className="text-base font-black text-slate-900">{String(count)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-4 text-xs text-slate-400">
                                Belum ada data status mesin.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}