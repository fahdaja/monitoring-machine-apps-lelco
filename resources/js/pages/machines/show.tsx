import React, { useState, FormEvent } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export interface MachineDetail {
    id: number;
    machineId: string;
    machineCode?: string;
    machineName: string;
    category: string;
    machineType: string;
    subType?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    manufacturingYear?: number;
    department?: string;
    area?: string;
    location: string;
    picDepartment?: string;
    commissionDate?: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'RUNNING' | 'DOWN' | 'UNDER_REPAIR' | 'WAITING_VENDOR';
    qrId?: string;
    isActive: boolean;
    notes?: string;
}

export interface BreakdownHistoryItem {
    id: number;
    ticketId: string;
    category: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    problem: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'UNDER_REPAIR' | 'WAITING_SPAREPART' | 'WAITING_VENDOR' | 'READY_FOR_CLOSING' | 'CLOSED';
    pipelineStage: 'REPORT' | 'REPAIR' | 'WAITING' | 'CLOSING' | 'VERIFICATION';
    reportedAt: string;
    closedAt?: string;
    breakdownMinutes: number;
    rootCause?: string;
    correctiveAction?: string;
}

export interface PreventiveInspectionItem {
    id: number;
    inspectionCode: string;
    title: string;
    inspectorName?: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    resultStatus?: 'PASSED' | 'WARNING' | 'FAILED';
    inspectedAt?: string;
    nextScheduleAt?: string;
    findings?: string;
    notes?: string;
}

interface MachineShowProps {
    machine?: MachineDetail;
    breakdowns?: BreakdownHistoryItem[];
    inspections?: PreventiveInspectionItem[];
}

export default function MachineShow({ 
    machine, 
    breakdowns = [], 
    inspections = [] 
}: MachineShowProps) {
    const [showReportModal, setShowReportModal] = useState(false);
    const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false);

    const currentMachine: MachineDetail = machine || {
        id: 1,
        machineId: 'MCH-001',
        machineCode: 'STMP-500T-01',
        machineName: 'Hydraulic Press Machine 500T',
        category: 'PRESS',
        machineType: 'HYDRAULIC',
        subType: 'HEAVY DUTY',
        brand: 'KOMATSU',
        model: 'PH500-V2',
        serialNumber: 'KM-2021-98765',
        manufacturingYear: 2021,
        department: 'STAMPING',
        area: 'ZONE A',
        location: 'Line A - Area 01',
        picDepartment: 'MAINTENANCE DEPT',
        commissionDate: '2021-05-15',
        criticality: 'CRITICAL',
        status: 'RUNNING',
        qrId: 'QR-MCH001-XYZ',
        isActive: true,
        notes: 'Perlu pemeriksaan rutin harian pada kebocoran oli katup solenoid utama.',
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        machine_id: currentMachine.machineId,
        category: 'GENERAL',
        priority: 'MEDIUM',
        description: '',
    });

    const handleReportSubmit = (e: FormEvent) => {
        e.preventDefault();
        router.post('/breakdowns', data, {
            onSuccess: () => {
                setShowReportModal(false);
                reset();
            },
        });
    };

    const formatDowntime = (minutes: number): string => {
        const m = Number(minutes || 0);
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        const r = m % 60;
        return `${h}j ${r}m`;
    };

    const getStatusBadge = (status: MachineDetail['status']) => {
        switch (status) {
            case 'RUNNING':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'DOWN':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'UNDER_REPAIR':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getInspectionResultBadge = (result?: PreventiveInspectionItem['resultStatus']) => {
        switch (result) {
            case 'PASSED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'WARNING':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'FAILED':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const operationalInfo = [
        { label: 'Lokasi Pasang', value: currentMachine.location },
        { label: 'Area / Zone', value: currentMachine.area },
        { label: 'Departemen', value: currentMachine.department },
        { label: 'PIC Departemen', value: currentMachine.picDepartment },
    ];

    const technicalSpecs = [
        { label: 'Merek / Brand', value: currentMachine.brand },
        { label: 'Model', value: currentMachine.model },
        { label: 'Nomor Seri (S/N)', value: currentMachine.serialNumber, isMono: true },
        { label: 'Tahun Pembuatan', value: currentMachine.manufacturingYear },
        { label: 'Tanggal Komisi', value: currentMachine.commissionDate },
        { label: 'Kode QR Terdaftar', value: currentMachine.qrId, isMono: true },
    ];

    return (
        <AppLayout>
            <Head title={`Machine Profile - ${currentMachine.machineName}`} />

            {/* Breadcrumb & Navigation Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link
                        href="/machines"
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 mb-1"
                    >
                        &larr; Tampilkan Semua Mesin
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Machine Profile
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {currentMachine.status === 'RUNNING' && (
                        <button
                            type="button"
                            onClick={() => setShowReportModal(true)}
                            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                        >
                            Laporkan Breakdown
                        </button>
                    )}
                </div>
            </div>

            {/* Main Machine Card (Hero Section) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl p-6 shadow-xl mb-6 border border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-5 mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                                {currentMachine.machineId}
                            </span>
                            {currentMachine.machineCode && (
                                <span className="text-xs font-mono text-slate-400">
                                    • {currentMachine.machineCode}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                            {currentMachine.machineName}
                        </h2>
                        <p className="text-xs text-slate-300 mt-1">
                            {currentMachine.category} &bull; {currentMachine.machineType} {currentMachine.subType ? `• ${currentMachine.subType}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-black px-3.5 py-1 rounded-full border shadow-sm ${getStatusBadge(currentMachine.status)}`}>
                            {currentMachine.status}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                            Criticality: <strong className="text-white">{currentMachine.criticality}</strong>
                        </span>
                    </div>
                </div>

                {/* Informasi Operasional & Lokasi */}
                <div className="mb-5">
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block mb-2.5">
                        Informasi Lokasi & Area Operasional
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {operationalInfo.map((info, idx) => (
                            <div key={idx} className="bg-white/10 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
                                <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">{info.label}</span>
                                <strong className="block text-white font-extrabold mt-0.5">{info.value || '-'}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Accordion Technical Specs */}
                <div className="pt-2 border-t border-slate-700/60">
                    <button
                        type="button"
                        onClick={() => setShowTechnicalSpecs(!showTechnicalSpecs)}
                        className={`w-full group flex items-center justify-between p-3 rounded-xl transition-all duration-300 cursor-pointer border ${
                            showTechnicalSpecs
                                ? 'bg-slate-800/90 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/5'
                                : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg transition-colors ${showTechnicalSpecs ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400 group-hover:text-slate-200'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Spesifikasi & Detail Teknis
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200 transition-colors hidden sm:inline">
                                {showTechnicalSpecs ? 'Sembunyikan' : 'Tampilkan Detail'}
                            </span>
                            <svg
                                className={`w-4 h-4 transform transition-transform duration-300 ${
                                    showTechnicalSpecs ? 'rotate-180 text-blue-400' : 'text-slate-400 group-hover:text-white'
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>

                    {showTechnicalSpecs && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {technicalSpecs.map((spec, idx) => (
                                <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl hover:border-slate-600 transition-colors">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{spec.label}</span>
                                    <strong className={`block text-slate-200 font-bold mt-0.5 ${spec.isMono ? 'font-mono text-emerald-400' : ''}`}>
                                        {spec.value || '-'}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {currentMachine.notes && (
                    <div className="mt-4 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
                        <span className="font-bold text-slate-400 mr-1">Catatan Khusus:</span>
                        <span className="italic">{currentMachine.notes}</span>
                    </div>
                )}
            </div>

            {/* Grid 2 Kolom untuk Riwayat Breakdown & Preventive Inspections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Riwayat Breakdown & Maintenance Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Riwayat Corrective & Breakdown</h3>
                                <p className="text-xs text-slate-500">Histori perbaikan dan laporan kendala teknis.</p>
                            </div>
                            <Link href="/breakdowns" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                Lihat Board &rarr;
                            </Link>
                        </div>

                        {breakdowns && breakdowns.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {breakdowns.map((b) => (
                                    <div key={b.id} className="py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex items-start justify-between gap-3 mb-1.5">
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{b.ticketId}</span>
                                                <p className="text-xs font-extrabold text-slate-900 leading-snug">{b.problem}</p>
                                            </div>
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                                                {b.status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                                            <span>Laporan: <strong className="text-slate-700">{b.reportedAt}</strong></span>
                                            {b.closedAt && <span>Selesai: <strong className="text-slate-700">{b.closedAt}</strong></span>}
                                            <span>Total Downtime: <strong className="text-slate-900">{formatDowntime(b.breakdownMinutes)}</strong></span>
                                        </div>

                                        {(b.rootCause || b.correctiveAction) && (
                                            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                                                {b.rootCause && (
                                                    <p><strong className="text-slate-700">Root Cause:</strong> {b.rootCause}</p>
                                                )}
                                                {b.correctiveAction && (
                                                    <p><strong className="text-slate-700">Tindakan:</strong> {b.correctiveAction}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                Belum ada riwayat kendala atau breakdown untuk mesin ini.
                            </div>
                        )}
                    </div>
                </div>

                {/* Riwayat Preventive Inspections Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Riwayat Preventive Inspections</h3>
                                <p className="text-xs text-slate-500">Histori pemeriksaan rutin dan pemeliharaan berjangka.</p>
                            </div>
                            <Link href="/preventive-inspections" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                Lihat Inspeksi &rarr;
                            </Link>
                        </div>

                        {inspections && inspections.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {inspections.map((item) => (
                                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex items-start justify-between gap-3 mb-1.5">
                                            <div>
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{item.inspectionCode}</span>
                                                <p className="text-xs font-extrabold text-slate-900 leading-snug">{item.title}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {item.resultStatus && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getInspectionResultBadge(item.resultStatus)}`}>
                                                        {item.resultStatus}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                                            {item.inspectedAt && <span>Inspeksi: <strong className="text-slate-700">{item.inspectedAt}</strong></span>}
                                            {item.inspectorName && <span>Inspector: <strong className="text-slate-700">{item.inspectorName}</strong></span>}
                                            {item.nextScheduleAt && <span>Jadwal Berikutnya: <strong className="text-blue-600 font-semibold">{item.nextScheduleAt}</strong></span>}
                                        </div>

                                        {(item.findings || item.notes) && (
                                            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                                                {item.findings && (
                                                    <p><strong className="text-slate-700">Temuan / Catatan Inspeksi:</strong> {item.findings}</p>
                                                )}
                                                {item.notes && (
                                                    <p><strong className="text-slate-700">Rekomendasi:</strong> {item.notes}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                Belum ada riwayat preventive inspection untuk mesin ini.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modal Form Report Breakdown */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Laporkan Breakdown Mesin</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{currentMachine.machineId} &bull; {currentMachine.machineName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowReportModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleReportSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Problem</label>
                                <input
                                    type="text"
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    placeholder="Contoh: ELECTRICAL, MECHANICAL, HYDRAULIC"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Prioritas Kerusakan</label>
                                <select
                                    value={data.priority}
                                    onChange={(e) => setData('priority', e.target.value as any)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-900 bg-white"
                                >
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="CRITICAL">CRITICAL</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Deskripsi Masalah <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Jelaskan secara rinci kendala atau indikasi kerusakan..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-slate-900"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {processing ? 'Mengirim...' : 'Kirim Laporan Breakdown'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}