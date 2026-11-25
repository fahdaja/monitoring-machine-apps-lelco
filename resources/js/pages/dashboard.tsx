import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '../layouts/app-layout';
import { triggerQrScanner } from '../components/qr/FloatingQrButton';

interface MachineTask {
    taskId: number | string;
    taskCode?: string;
    machineDbId?: number | null;
    machineId: string;
    machineName: string;
    activity: string;
    level: string;
    scheduledDate: string;
    location: string;
    status: 'DUE' | 'OVERDUE' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
    assignedUserName?: string | null;
    isAssignedToOther?: boolean;
    canWork?: boolean;
}

export default function Dashboard({
    isAdmin = false,
    isMonitoringRole = false,
    isOperator = false,
    summary,
    managementMetrics,
    masterHealth,
    myMachines,
    myInspectionTasks,
    myProblems,
    breakdowns,
    statusCounts,
    syncedAt,
}: any) {
    const { auth } = usePage<any>().props;
    const todayStr = new Date().toISOString().slice(0, 10);
    const firstOfMonthStr = `${todayStr.slice(0, 8)}01`;
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState(firstOfMonthStr);
    const [exportEndDate, setExportEndDate] = useState(todayStr);

    const handleDownloadAuditExcel = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams({
            start_date: exportStartDate,
            end_date: exportEndDate,
        });
        window.location.href = `/audit/export-excel?${params.toString()}`;
        setIsExportModalOpen(false);
    };
    const canVerify = isAdmin || auth?.user?.role?.toUpperCase() === 'SUPERVISOR';

    const formatTicketStatus = (status: string) =>
        status?.toUpperCase() === 'READY_FOR_CLOSING' && !canVerify ? 'WAITING_VERIFICATION' : status;

    const formatDowntime = (minutes: any) => {
        const m = Number(minutes || 0);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        return r > 0 ? `${h}j ${r}m` : `${h}j`;
    };

    const getBadgeClass = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING':
            case 'COMPLETED':
            case 'CLOSED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'DOWN':
            case 'OVERDUE':
            case 'CRITICAL':
            case 'OPEN':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'UNDER_REPAIR':
            case 'IN_REPAIR':
            case 'DUE':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'IN_PROGRESS':
            case 'WAITING_SPAREPART':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'WAITING_VENDOR':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'WAITING_VERIFICATION':
            case 'READY_FOR_CLOSING':
                return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'UPCOMING':
            case 'ACKNOWLEDGED':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'INACTIVE':
                return 'bg-slate-200 text-slate-700 border-slate-300';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusDotClass = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'RUNNING': return 'bg-emerald-500';
            case 'DOWN': return 'bg-rose-500';
            case 'UNDER_REPAIR': return 'bg-amber-500';
            case 'WAITING_SPAREPART': return 'bg-indigo-500';
            case 'WAITING_VENDOR': return 'bg-purple-500';
            case 'WAITING_VERIFICATION': return 'bg-sky-500';
            case 'INACTIVE': return 'bg-slate-400';
            default: return 'bg-slate-400';
        }
    };

    const getStatusCardClass = (status: string, count: number) => {
        if (count <= 0) return 'border-slate-200 bg-slate-50/50 text-slate-500';
        switch (status?.toUpperCase()) {
            case 'RUNNING': return 'border-emerald-200 bg-emerald-50/70 text-emerald-900';
            case 'DOWN': return 'border-rose-200 bg-rose-50/70 text-rose-900';
            case 'UNDER_REPAIR': return 'border-amber-200 bg-amber-50/70 text-amber-900';
            case 'WAITING_SPAREPART': return 'border-indigo-200 bg-indigo-50/70 text-indigo-900';
            case 'WAITING_VENDOR': return 'border-purple-200 bg-purple-50/70 text-purple-900';
            case 'WAITING_VERIFICATION': return 'border-sky-200 bg-sky-50/70 text-sky-900';
            case 'INACTIVE': return 'border-slate-300 bg-slate-100/80 text-slate-800';
            default: return 'border-slate-200 bg-slate-50/50 text-slate-800';
        }
    };

    // KPI Cards untuk Operator / Teknisi
    const operatorKpiCards = [
        { label: 'Total Mesin', value: summary?.totalMachines ?? 0, sub: 'Mesin aktif' },
        { label: 'Running', value: summary?.running ?? 0, sub: 'Saat ini' },
        { label: 'Down', value: summary?.down ?? 0, sub: 'Breakdown' },
        { label: 'Under Repair', value: summary?.underRepair ?? 0, sub: 'Corrective' },
        { label: 'Open Breakdown', value: summary?.openBreakdown ?? 0, sub: 'Ticket aktif' },
        { label: 'Inspection Due', value: summary?.inspectionDueToday ?? 0, sub: 'Hari ini' },
        { label: 'Overdue', value: summary?.inspectionOverdue ?? 0, sub: 'Preventive' },
        { label: 'Completed', value: summary?.inspectionCompletedToday ?? 0, sub: 'Hari ini' },
    ];

    // KPI Cards untuk Admin & Supervisor (bebas duplikasi dengan Ringkasan Status Mesin)
    const pmRate = managementMetrics?.pmComplianceRate;
    const monitoringKpiCards = [
        {
            label: 'Menunggu Verifikasi',
            value: managementMetrics?.pendingVerificationCount ?? 0,
            sub: 'Perlu persetujuan',
            accent: (managementMetrics?.pendingVerificationCount ?? 0) > 0 ? 'border-sky-300 bg-sky-50/60' : '',
            valueClass: (managementMetrics?.pendingVerificationCount ?? 0) > 0 ? 'text-sky-700' : 'text-slate-900',
        },
        {
            label: 'Open Breakdown',
            value: summary?.openBreakdown ?? 0,
            sub: 'Tiket aktif pabrik',
            accent: (summary?.openBreakdown ?? 0) > 0 ? 'border-rose-300 bg-rose-50/60' : '',
            valueClass: (summary?.openBreakdown ?? 0) > 0 ? 'text-rose-700' : 'text-slate-900',
        },
        {
            label: 'PM Compliance',
            value: pmRate !== null && pmRate !== undefined ? `${pmRate}%` : '-',
            sub: `${managementMetrics?.pmCompletedThisMonth ?? 0}/${managementMetrics?.pmTotalDueThisMonth ?? 0} bulan ini`,
            accent: '',
            valueClass:
                pmRate === null || pmRate === undefined
                    ? 'text-slate-900'
                    : pmRate >= 85
                    ? 'text-emerald-700'
                    : pmRate >= 60
                    ? 'text-amber-700'
                    : 'text-rose-700',
        },
        {
            label: 'Inspection Due / Overdue',
            value: `${summary?.inspectionDueToday ?? 0} / ${summary?.inspectionOverdue ?? 0}`,
            sub: `Selesai hari ini: ${summary?.inspectionCompletedToday ?? 0}`,
            accent: (summary?.inspectionOverdue ?? 0) > 0 ? 'border-amber-300 bg-amber-50/50' : '',
            valueClass: (summary?.inspectionOverdue ?? 0) > 0 ? 'text-amber-800' : 'text-slate-900',
        },
        {
            label: 'Total Downtime',
            value: formatDowntime(managementMetrics?.monthlyDowntimeMinutes ?? 0),
            sub: 'Bulan berjalan',
            accent: '',
            valueClass: 'text-slate-900',
        },
        {
            label: 'MTTR (Rata-rata)',
            value: (managementMetrics?.closedThisMonthCount ?? 0) > 0
                ? formatDowntime(managementMetrics?.mttrMinutes ?? 0)
                : '-',
            sub: `${managementMetrics?.closedThisMonthCount ?? 0} tiket selesai`,
            accent: '',
            valueClass: 'text-slate-900',
        },
    ];

    const renderStatusSummaryCard = () => (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Ringkasan Status Mesin</h2>
                    <p className="text-xs text-slate-500">Total {summary?.totalMachines ?? 0} mesin aktif terdaftar.</p>
                </div>
                <Link href="/machines" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                    Lihat Mesin &rarr;
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {statusCounts && Object.keys(statusCounts).length > 0 ? (
                    Object.entries(statusCounts).map(([status, count]) => {
                        const total = Number(count || 0);
                        return (
                            <div
                                key={status}
                                className={`border rounded-xl p-3 flex items-center justify-between gap-2 transition-colors ${getStatusCardClass(status, total)}`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${total > 0 ? getStatusDotClass(status) : 'bg-slate-300'}`} />
                                    <span className="text-[11px] font-bold leading-tight break-words">
                                        {status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <span className={`text-base font-black shrink-0 ${total > 0 ? '' : 'text-slate-400'}`}>
                                    {total}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-4 text-xs text-slate-400">
                        Belum ada data status mesin.
                    </div>
                )}
            </div>
        </div>
    );

    const renderBreakdownSystemCard = () => (
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
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                    {breakdowns.map((b: any) => (
                        <Link
                            key={b.id}
                            href={b.canViewDetail ? `/breakdowns/${b.ticketId}` : '/breakdowns'}
                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                        >
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{b.machineName}</h4>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                    <span className="font-mono text-slate-700 mr-1.5">{b.ticketId}</span>
                                    {b.problem}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(b.status)}`}>
                                    {formatTicketStatus(b.status)}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono mt-1">
                                    {formatDowntime(b.breakdownMinutes)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                    Tidak ada breakdown aktif saat ini.
                </div>
            )}
        </div>
    );

    return (
        <AppLayout>
            <Head title="Dashboard" />

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isMonitoringRole
                            ? 'Monitoring performa mesin, kepatuhan preventive inspection, dan status breakdown pabrik.'
                            : 'Monitoring kondisi mesin, preventive inspection, dan machine breakdown.'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isMonitoringRole && (
                        <button
                            type="button"
                            onClick={() => setIsExportModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Audit Excel
                        </button>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Terakhir disinkronkan: {syncedAt || 'Baru saja'}
                    </span>
                </div>
            </div>

            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Export Laporan Audit Excel</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    File .xlsx berisi 5 sheet: Ringkasan KPI, Inspeksi PM, Breakdown & Downtime, Detail Jawaban, dan Master Mesin & PIC.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsExportModalOpen(false)}
                                className="text-slate-400 hover:text-slate-700 text-lg font-bold leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleDownloadAuditExcel} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        max={exportEndDate}
                                        required
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Akhir</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        min={exportStartDate}
                                        required
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsExportModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                                >
                                    Download .xlsx
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isMonitoringRole ? (
                <>
                    {/* KPI Cards: Admin & Supervisor */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                        {monitoringKpiCards.map((card, idx) => (
                            <div
                                key={idx}
                                className={`bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow ${card.accent}`}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">{card.label}</span>
                                <span className={`text-2xl font-black mt-1 block tracking-tight ${card.valueClass}`}>{card.value}</span>
                                <span className="text-[11px] text-slate-500 mt-0.5 block">{card.sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* Kesehatan Master Data (Khusus ADMIN) */}
                    {isAdmin && masterHealth && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Kesehatan Master Data & Konfigurasi</h2>
                                    <p className="text-[11px] text-slate-500">Ringkasan data referensi sistem yang dikelola Admin.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                <Link href="/users" className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">User Aktif</span>
                                    <span className="text-xl font-black text-slate-900 mt-0.5 block">{masterHealth.activeUsers}</span>
                                </Link>
                                <Link href="/forms" className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Template Form</span>
                                    <span className="text-xl font-black text-slate-900 mt-0.5 block">{masterHealth.totalForms}</span>
                                </Link>
                                <Link href="/schedules" className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Schedule Aktif</span>
                                    <span className="text-xl font-black text-slate-900 mt-0.5 block">{masterHealth.activeSchedules}</span>
                                </Link>
                                <Link href="/schedules" className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Kondisi Trigger</span>
                                    <span className="text-xl font-black text-slate-900 mt-0.5 block">{masterHealth.activeConditions}</span>
                                </Link>
                                <Link
                                    href="/machines"
                                    className={`border rounded-xl p-3 transition-colors ${
                                        masterHealth.machinesWithoutPic > 0
                                            ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-50'
                                            : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Mesin Tanpa PIC</span>
                                    <span className={`text-xl font-black mt-0.5 block ${masterHealth.machinesWithoutPic > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {masterHealth.machinesWithoutPic}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Row 1: Tiket Menunggu Verifikasi & Ringkasan Status Mesin */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Tiket Menunggu Verifikasi</h2>
                                    <p className="text-xs text-slate-500">Perbaikan selesai yang butuh verifikasi penutupan.</p>
                                </div>
                                <Link href="/breakdowns" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                                    Buka Pipeline &rarr;
                                </Link>
                            </div>

                            {managementMetrics?.pendingVerificationTickets?.length > 0 ? (
                                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                                    {managementMetrics.pendingVerificationTickets.map((t: any) => (
                                        <Link
                                            key={t.id}
                                            href={`/breakdowns/${t.ticketId}`}
                                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{t.machineName}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                    <span className="font-mono text-slate-700 font-semibold mr-1.5">{t.ticketId}</span>
                                                    {t.problem}
                                                </p>
                                            </div>
                                            <span className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg whitespace-nowrap">
                                                Periksa &rarr;
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                    Tidak ada tiket yang menunggu verifikasi saat ini.
                                </div>
                            )}
                        </div>

                        {renderStatusSummaryCard()}
                    </div>

                    {/* Row 2: Inspection Perlu Perhatian & Top Mesin Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Inspection Perlu Perhatian</h2>
                                    <p className="text-xs text-slate-500">Task overdue, jatuh tempo hari ini, atau sedang dikerjakan.</p>
                                </div>
                                <Link
                                    href={isAdmin ? '/schedules' : '/inspection-calender'}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    {isAdmin ? 'Kelola Schedule →' : 'Lihat Kalender →'}
                                </Link>
                            </div>

                            {myInspectionTasks && myInspectionTasks.length > 0 ? (
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                    {myInspectionTasks.map((t: MachineTask) => (
                                        <div
                                            key={t.taskId}
                                            className={`p-3.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/80 transition-colors border-l-4 ${
                                                t.status === 'OVERDUE' ? 'border-l-rose-500' :
                                                t.status === 'DUE' ? 'border-l-amber-500' : 'border-l-blue-500'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-grid place-items-center min-w-[28px] h-5 px-1.5 bg-slate-100 text-slate-900 text-[10px] font-black rounded">
                                                            {t.level || 'Rutin'}
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
                                                    {t.status === 'IN_PROGRESS' && t.assignedUserName && (
                                                        <p className="text-[11px] font-medium text-amber-700 mt-1">
                                                            Dikerjakan oleh: {t.assignedUserName}
                                                        </p>
                                                    )}
                                                </div>

                                                {t.machineDbId && (
                                                    <Link
                                                        href={`/machines/${t.machineDbId}`}
                                                        className="shrink-0 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-center"
                                                    >
                                                        Lihat Mesin
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-emerald-200 rounded-xl bg-emerald-50/40 text-emerald-700 text-xs font-medium">
                                    Semua inspeksi hingga hari ini aman — tidak ada task terlambat.
                                </div>
                            )}
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Top Mesin Sering Breakdown</h2>
                                    <p className="text-xs text-slate-500">Berdasarkan jumlah laporan dalam 30 hari terakhir.</p>
                                </div>
                                <Link href="/machines" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                                    Semua Mesin &rarr;
                                </Link>
                            </div>

                            {managementMetrics?.topBreakdownMachines?.length > 0 ? (
                                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                                    {managementMetrics.topBreakdownMachines.map((m: any, idx: number) => (
                                        <Link
                                            key={m.id}
                                            href={`/machines/${m.id}`}
                                            className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 text-sm truncate">{m.machineName}</h4>
                                                    <p className="text-[11px] text-slate-500 truncate">
                                                        <span className="font-mono">{m.machineCode}</span> &bull; {m.location}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                    {m.ticketCount}x
                                                </span>
                                                <span className="block text-[10px] text-slate-400 font-mono mt-1">
                                                    {formatDowntime(m.totalDowntimeMinutes)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                    Belum ada riwayat breakdown dalam 30 hari terakhir.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Breakdown System Aktif */}
                    <div className="mb-6">{renderBreakdownSystemCard()}</div>
                </>
            ) : (
                <>
                    {/* KPI Cards Grid: Operator / Teknisi */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                        {operatorKpiCards.map((card, idx) => (
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
                                {myMachines.map((m: any) => (
                                    <div key={m.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-colors">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                {m.responsibilityType}
                                            </span>
                                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getBadgeClass(m.status)}`}>
                                                {String(m.status || '').replace(/_/g, ' ')}
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
                                                href={`/machines/${m.id}`}
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
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Inspection Mesin Saya</h2>
                                    <p className="text-xs text-slate-500">Task preventive aktif untuk mesin assignment Anda.</p>
                                </div>
                                <Link href="/inspection-calender" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                    Lihat Kalender &rarr;
                                </Link>
                            </div>

                            {myInspectionTasks && myInspectionTasks.length > 0 ? (
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                    {myInspectionTasks.map((t: MachineTask) => (
                                        <div
                                            key={t.taskId}
                                            className={`p-3.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50/80 transition-colors border-l-4 ${
                                                t.status === 'OVERDUE' ? 'border-l-rose-500' :
                                                t.status === 'DUE' ? 'border-l-amber-500' :
                                                t.status === 'IN_PROGRESS' ? 'border-l-indigo-500' :
                                                t.status === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-blue-500'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-grid place-items-center min-w-[28px] h-5 px-1.5 bg-slate-100 text-slate-900 text-[10px] font-black rounded">
                                                            {t.level || 'Rutin'}
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
                                                    {t.status === 'IN_PROGRESS' && t.assignedUserName && (
                                                        <p className="text-[11px] font-medium text-amber-700 mt-1">
                                                            Dikerjakan oleh: {t.assignedUserName}
                                                        </p>
                                                    )}
                                                </div>

                                                {['DUE', 'OVERDUE', 'IN_PROGRESS'].includes(t.status) && (
                                                    t.isAssignedToOther ? (
                                                        <span
                                                            className="shrink-0 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg whitespace-nowrap self-center cursor-not-allowed"
                                                            title={`Sedang dikerjakan oleh ${t.assignedUserName || 'teknisi lain'}`}
                                                        >
                                                            Sedang Dikerjakan
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                triggerQrScanner({
                                                                    expectedMachineCode: t.machineId,
                                                                    targetTaskId: t.taskId,
                                                                    machineName: t.machineName,
                                                                    activity: t.activity,
                                                                })
                                                            }
                                                            className="shrink-0 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap self-center cursor-pointer"
                                                        >
                                                            {t.status === 'IN_PROGRESS' ? 'Scan & Lanjutkan' : 'Scan & Mulai'}
                                                        </button>
                                                    )
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
                                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                                    {myProblems.map((prob: any) => (
                                        <Link
                                            key={prob.id}
                                            href={prob.canViewDetail ? `/breakdowns/${prob.ticketId}` : '/breakdowns'}
                                            className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{prob.machineName}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                    <span className="font-mono text-slate-700 font-semibold mr-1.5">{prob.ticketId}</span>
                                                    {prob.problem}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(prob.status)}`}>
                                                {formatTicketStatus(prob.status)}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                    Tidak ada breakdown aktif pada mesin Anda.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grid Bawah: Breakdown System Aktif (non-operator) & Ringkasan Status Mesin */}
                    <div className={`grid grid-cols-1 ${isOperator ? '' : 'lg:grid-cols-2'} gap-6 mb-6`}>
                        {!isOperator && renderBreakdownSystemCard()}
                        {renderStatusSummaryCard()}
                    </div>
                </>
            )}
        </AppLayout>
    );
}
