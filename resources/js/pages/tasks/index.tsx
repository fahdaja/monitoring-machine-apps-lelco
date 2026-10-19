import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../layouts/app-layout';

// Type Definitions
export interface InspectionTask {
    taskId: string;
    machineId: string;
    machineName: string;
    activity: string;
    level: 'L1' | 'L2' | 'L3';
    scheduledDate: string; // Format: YYYY-MM-DD
    location: string;
    department?: string;
    status: 'DUE' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED';
    inspectorName?: string;
    completedAt?: string;
}

interface InspectionCalendarData {
    year: number;
    month: number;
    daysInMonth: number;
    firstWeekday: number; // 0: Senin, 6: Minggu
    today: string;
    tasks: InspectionTask[];
}

interface TasksIndexProps {
    calendarData?: InspectionCalendarData;
}

export default function TasksIndex({ calendarData }: TasksIndexProps) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fallback Mock Data jika props belum dikirim dari Laravel
    const mockData: InspectionCalendarData = calendarData || {
        year: 2026,
        month: 10,
        daysInMonth: 31,
        firstWeekday: 3, // Kamis
        today: todayStr,
        tasks: [
            {
                taskId: 'TSK-202610-001',
                machineId: 'MCH-001',
                machineName: 'Hydraulic Press 500T',
                activity: 'Pemeriksaan Rutin Level Oli & Kebocoran Valve',
                level: 'L1',
                scheduledDate: '2026-10-13',
                location: 'Line A - Area 01',
                status: 'DUE',
            },
            {
                taskId: 'TSK-202610-002',
                machineId: 'MCH-004',
                machineName: 'CNC Milling VMC850',
                activity: 'Inspeksi Vibrasi Spindle & Pelumasan Guide Way',
                level: 'L2',
                scheduledDate: '2026-10-12',
                location: 'Line B - Area 03',
                status: 'OVERDUE',
            },
            {
                taskId: 'TSK-202610-003',
                machineId: 'MCH-002',
                machineName: 'Robotic Arm Welding',
                activity: 'Inspeksi Tekanan Pneumatik & Kebersihan Tip Torch',
                level: 'L1',
                scheduledDate: '2026-10-13',
                location: 'Line A - Area 02',
                status: 'COMPLETED',
                inspectorName: 'Budi Santoso',
                completedAt: '09:15',
            },
            {
                taskId: 'TSK-202610-004',
                machineId: 'MCH-009',
                machineName: 'Compressor Screw 55KW',
                activity: 'Pemeriksaan Air Filter & Drain Condensate Tank',
                level: 'L1',
                scheduledDate: '2026-10-15',
                location: 'Utility Room',
                status: 'UPCOMING',
            },
        ],
    };

    const [currentYear, setCurrentYear] = useState(mockData.year);
    const [currentMonth, setCurrentMonth] = useState(mockData.month);
    const [selectedDate, setSelectedDate] = useState<string>(mockData.today);
    const [selectedTaskForModal, setSelectedTaskForModal] = useState<InspectionTask | null>(null);

    // Filter Task berdasarkan Tanggal Terpilih
    const tasksForSelectedDate = mockData.tasks.filter((t) => t.scheduledDate === selectedDate);

    // Navigasi Bulan Kalender
    const handlePrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const getMonthLabel = (m: number, y: number) => {
        const date = new Date(y, m - 1, 1);
        return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    };

    const getBadgeClass = (status: InspectionTask['status']) => {
        switch (status) {
            case 'DUE':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'OVERDUE':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'UPCOMING':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Render Hari Kalender (31 Hari)
    const renderCalendarDays = () => {
        const days = [];
        const weekDaysHeader = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'];

        // 1. Header Nama Hari
        const headers = weekDaysHeader.map((wd, i) => (
            <div key={i} className="text-center text-[10px] font-black uppercase text-slate-400 py-1.5">
                {wd}
            </div>
        ));

        // 2. Blank Days Sebelum Tanggal 1
        for (let i = 0; i < mockData.firstWeekday; i++) {
            days.push(<div key={`blank-${i}`} className="min-h-[50px] bg-transparent" />);
        }

        // 3. Tanggal-tanggal Bulan
        for (let day = 1; day <= mockData.daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = mockData.tasks.filter((t) => t.scheduledDate === dateStr);
            const isToday = dateStr === mockData.today;
            const isSelected = dateStr === selectedDate;

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[58px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                        isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                            : isToday
                            ? 'bg-blue-50/60 border-blue-300 text-slate-900 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                    }`}
                >
                    <span className="text-xs font-extrabold">{day}</span>

                    {dayTasks.length > 0 && (
                        <div className="flex items-center justify-between w-full mt-1">
                            {/* Dots Indicator */}
                            <div className="flex items-center gap-1">
                                {dayTasks.slice(0, 3).map((t, idx) => (
                                    <span
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            t.status === 'OVERDUE'
                                                ? 'bg-rose-500'
                                                : t.status === 'DUE'
                                                ? 'bg-amber-500'
                                                : t.status === 'COMPLETED'
                                                ? 'bg-emerald-500'
                                                : 'bg-blue-500'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                    isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                                {dayTasks.length}
                            </span>
                        </div>
                    )}
                </button>
            );
        }

        return (
            <div>
                <div className="grid grid-cols-7 gap-1 mb-1">{headers}</div>
                <div className="grid grid-cols-7 gap-1">{days}</div>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="Inspection Tasks & Calendar" />

            {/* Header Halaman */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Inspection Tasks
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Jadwal preventive inspection L1/L2. Pilih tanggal pada kalender untuk melihat task aktif.
                    </p>
                </div>
            </div>

            {/* Calendar & Task Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Panel Kalender Bulanan (Left - 7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    {/* Toolbar Kalender */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                        >
                            &lsaquo;
                        </button>

                        <div className="flex items-center gap-3">
                            <h2 className="text-base font-black text-slate-900 capitalize">
                                {getMonthLabel(currentMonth, currentYear)}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(mockData.today)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800"
                            >
                                Hari Ini
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                        >
                            &rsaquo;
                        </button>
                    </div>

                    {/* Render Kalender */}
                    {renderCalendarDays()}

                    {/* Legenda Indikator */}
                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold mt-4 pt-3 border-t border-slate-100 flex-wrap">
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Due</span>
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Overdue</span>
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Upcoming</span>
                        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Completed</span>
                    </div>
                </div>

                {/* 2. Panel Detail Task per Tanggal (Right - 5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="border-b border-slate-100 pb-3 mb-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">DETAIL TASK</span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                            {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDate))}
                        </h3>
                    </div>

                    {/* Task List */}
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                        {tasksForSelectedDate.length > 0 ? (
                            tasksForSelectedDate.map((t) => (
                                <div
                                    key={t.taskId}
                                    className={`p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white transition-all border-l-4 ${
                                        t.status === 'OVERDUE'
                                            ? 'border-l-rose-500'
                                            : t.status === 'DUE'
                                            ? 'border-l-amber-500'
                                            : t.status === 'COMPLETED'
                                            ? 'border-l-emerald-500'
                                            : 'border-l-blue-500'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-grid place-items-center px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded">
                                                {t.level}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(t.status)}`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">{t.taskId}</span>
                                    </div>

                                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{t.activity}</h4>
                                    
                                    <div className="mt-2 text-xs text-slate-600">
                                        <Link href={`/machines/${t.machineId}`} className="font-bold text-slate-900 hover:underline">
                                            {t.machineName}
                                        </Link>
                                        <span className="block text-[11px] text-slate-400 mt-0.5">{t.machineId} &bull; {t.location}</span>
                                    </div>

                                    {t.completedAt && (
                                        <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                                            Selesai oleh {t.inspectorName} jam {t.completedAt}
                                        </p>
                                    )}

                                    {['DUE', 'OVERDUE'].includes(t.status) && (
                                        <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTaskForModal(t)}
                                                className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-center transition-colors"
                                            >
                                                Scan QR &amp; Mulai Inspeksi
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                Tidak ada jadwal inspection task pada tanggal ini.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modal Verifikasi QR sebelum Mulai Inspeksi */}
            {selectedTaskForModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-900 font-black text-xl">
                            &;
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">Verifikasi QR Mesin</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Scan QR fisik mesin <strong className="text-slate-900">{selectedTaskForModal.machineId}</strong> sebelum memulai pengisian lembar inspeksi.
                        </p>

                        <div className="my-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs">
                            <span className="text-[10px] font-mono text-slate-400 block">{selectedTaskForModal.taskId}</span>
                            <strong className="block text-slate-900 text-sm font-bold mt-0.5">{selectedTaskForModal.activity}</strong>
                            <span className="block text-slate-500 mt-1">{selectedTaskForModal.machineName} ({selectedTaskForModal.location})</span>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    alert(`Buka scanner QR untuk mesin ${selectedTaskForModal.machineId}`);
                                    setSelectedTaskForModal(null);
                                }}
                                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Buka Camera Scanner
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTaskForModal(null)}
                                className="w-full py-2 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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