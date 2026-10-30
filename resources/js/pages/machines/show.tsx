import React, { useState, useRef, FormEvent } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Printer, Download, Copy, Check, Eye, X, Edit3, Trash2, AlertTriangle } from 'lucide-react';

interface User {
    id: number;
    full_name: string;
    role: string
}

interface pageProps {
    auth: {
        user: User
    }
    [key: string]: any;
}

export interface MachineDetail {
    id: number;
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
    isActive: boolean;
    specifications?: Record<string, any>;
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
    const [showQrModal, setShowQrModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(false);

    const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const handleDelete = () => {
        setIsDeleting(true);
        router.delete(`/machines/${currentMachine.id}`, {
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteModal(false);
            },
        });
    };

    const currentMachine: MachineDetail = machine || {
        id: 1,
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
        isActive: true,
    };

    const qrValue = currentMachine.machineCode ?? ""

    const handleCopyCode = () => {
        navigator.clipboard.writeText(qrValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadPng = () => {
        const canvas = modalCanvasRef.current || heroCanvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR_${currentMachine.machineCode}.png`;
        link.click();
    };

    const handlePrintSticker = () => {
        const canvas = modalCanvasRef.current || heroCanvasRef.current;
        if (!canvas) return;
        const qrDataUrl = canvas.toDataURL('image/png');

        const printWindow = window.open('', '_blank', 'width=620,height=650');
        if (!printWindow) {
            alert('Pop-up terblokir. Mohon izinkan pop-up pada peramban Anda untuk mencetak stiker.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stiker QR Mesin - ${currentMachine.machineCode}</title>
                <meta charset="utf-8" />
                <style>
                    @page {
                        size: 80mm 60mm;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 8px;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #ffffff;
                        color: #0f172a;
                    }
                    .tag-card {
                        width: 100%;
                        max-width: 320px;
                        border: 2px solid #0f172a;
                        border-radius: 8px;
                        padding: 8px;
                        text-align: center;
                    }
                    .tag-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 0.5px;
                        text-transform: uppercase;
                        border-bottom: 1.5px solid #0f172a;
                        padding-bottom: 4px;
                        margin-bottom: 6px;
                    }
                    .qr-container {
                        display: flex;
                        justify-content: center;
                        margin: 4px 0;
                    }
                    .qr-container img {
                        width: 130px;
                        height: 130px;
                    }
                    .machine-code {
                        display: inline-block;
                        font-family: monospace;
                        font-size: 15px;
                        font-weight: 900;
                        letter-spacing: 1px;
                        background: #f1f5f9;
                        padding: 2px 8px;
                        border-radius: 4px;
                        border: 1px solid #cbd5e1;
                        margin-top: 2px;
                    }
                    .machine-name {
                        font-size: 12px;
                        font-weight: 700;
                        margin-top: 4px;
                        line-height: 1.2;
                    }
                    .tag-meta {
                        font-size: 9px;
                        color: #475569;
                        margin-top: 4px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="tag-card">
                    <div class="tag-header">
                        <span>LELCO APPS</span>
                        <span>ASSET MANAGEMENT</span>
                    </div>
                    <div class="qr-container">
                        <img src="${qrDataUrl}" alt="QR Code" />
                    </div>
                    <div class="machine-code">${currentMachine.machineCode}</div>
                    <div class="machine-name">${currentMachine.machineName}</div>
                    <div class="tag-meta">
                        Lokasi: ${currentMachine.location || '-'} &bull; ${currentMachine.category || ''}
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                        setTimeout(function() { window.close(); }, 700);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        id: currentMachine.id,
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
        { label: 'Commission Date', value: currentMachine.commissionDate }
    ];

    // const technicalSpecs = [
    //     { label: 'Merek / Brand', value: currentMachine.brand },
    //     { label: 'Model', value: currentMachine.model },
    //     { label: 'Nomor Seri (S/N)', value: currentMachine.serialNumber, isMono: true },
    //     { label: 'Tahun Pembuatan', value: currentMachine.manufacturingYear },
    //     { label: 'Tanggal Komisi', value: currentMachine.commissionDate },
    //     { label: 'Kode QR Terdaftar', value: currentMachine.qrValue, isMono: true },
    // ];

    const { auth } = usePage<pageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

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

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-xs border border-slate-200 transition-all cursor-pointer"
                    >
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span>Stiker & QR</span>
                    </button>
                    {isAdmin  && (
                     <>
                    <Link
                        href={`/machines/${currentMachine.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs border border-slate-200 transition-all"
                    >
                        <Edit3 className="w-4 h-4 text-blue-600" />
                        <span>Edit</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl shadow-xs border border-rose-200 transition-all cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Hapus</span>
                    </button>
                     </>   
                    )}
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
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-slate-700/60 pb-5 mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                                {currentMachine.id}
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

                    {/* QR Code Quick Badge & Status */}
                    <div className="flex flex-wrap items-center gap-4 bg-slate-800/80 border border-slate-700/80 p-3 rounded-2xl shadow-inner backdrop-blur-xs">
                        <div className="bg-white p-2 rounded-xl shadow-sm flex items-center justify-center">
                            <QRCodeCanvas
                                ref={heroCanvasRef}
                                value={qrValue}
                                size={68}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                        <div className="flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">QR Code Mesin</span>
                                <span className="font-mono text-xs font-extrabold text-emerald-400">{qrValue}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowQrModal(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                >
                                    <Eye className="w-3 h-3 text-slate-300" /> Detail
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrintSticker}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    <Printer className="w-3 h-3" /> Cetak
                                </button>
                            </div>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-2 pl-4 border-l border-slate-700">
                            <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-sm ${getStatusBadge(currentMachine.status)}`}>
                                {currentMachine.status}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                Criticality: <strong className="text-white">{currentMachine.criticality}</strong>
                            </span>
                        </div>
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
                            {Object.entries(currentMachine.specifications || {}).length > 0 ? (
                                Object.entries(currentMachine.specifications || {}).map(([key, val]) => (
                                    <div key={key} className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl hover:border-slate-600 transition-colors">
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        <strong className="block text-slate-200 font-bold mt-0.5 break-words">
                                            {String(val || '-')}
                                        </strong>
                                    </div>
                                ))
                            ) : (
                                <p className="col-span-full text-slate-400 italic text-xs py-2">
                                    Belum ada data spesifikasi teknis untuk mesin ini.
                                </p>
                            )}
                        </div>
                    )}
                </div>
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
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{currentMachine.id} &bull; {currentMachine.machineName}</p>
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

            {/* MODAL QR CODE & STIKER MESIN */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center relative">
                        {/* Tombol Close */}
                        <button
                            type="button"
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-center mb-5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                                <QrCode className="w-3.5 h-3.5" /> Label Aset Fisik Mesin
                            </div>
                            <h3 className="text-lg font-black text-slate-900">QR Code & Stiker Aset</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Dapat dicetak langsung atau diunduh untuk ditempel di bodi mesin.
                            </p>
                        </div>

                        {/* PREVIEW STIKER FISIK */}
                        <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-2xl flex flex-col items-center">
                            <div className="w-full bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sm text-center">
                                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3 text-[10px] font-black uppercase tracking-wider text-slate-800">
                                    <span>LELCO APPS</span>
                                    <span>ASSET TAG</span>
                                </div>

                                <div className="flex justify-center p-2 bg-white rounded-lg">
                                    <QRCodeCanvas
                                        ref={modalCanvasRef}
                                        value={qrValue}
                                        size={180}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>

                                <div className="mt-3">
                                    <div className="inline-block font-mono text-sm font-black bg-slate-100 px-3 py-1 rounded-md border border-slate-300 text-slate-900 tracking-wider">
                                        {currentMachine.machineCode}
                                    </div>
                                    <h4 className="text-xs font-extrabold text-slate-900 mt-2 truncate">
                                        {currentMachine.machineName}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        {currentMachine.location} &bull; {currentMachine.category}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Nilai QR & Tombol Copy */}
                        <div className="w-full mt-4 flex items-center justify-between bg-slate-100/80 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
                            <div className="truncate mr-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Scan:</span>
                                <span className="font-mono font-bold text-slate-800">{qrValue}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all text-xs shrink-0 cursor-pointer"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-600">Disalin!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Salin</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* TOMBOL AKSI UTAMA */}
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <button
                                type="button"
                                onClick={handleDownloadPng}
                                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4" /> Unduh PNG
                            </button>
                            <button
                                type="button"
                                onClick={handlePrintSticker}
                                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all cursor-pointer"
                            >
                                <Printer className="w-4 h-4 text-emerald-400" /> Cetak Stiker
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL KONFIRMASI HAPUS */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center relative text-center">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">Hapus Data Mesin?</h3>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            Apakah Anda yakin ingin menghapus mesin <span className="font-bold text-slate-800">{currentMachine.machineName}</span> ({currentMachine.machineCode})? Data yang sudah dihapus tidak dapat dipulihkan.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setShowDeleteModal(false)}
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