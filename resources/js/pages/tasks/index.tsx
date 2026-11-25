import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../../layouts/app-layout';
import { triggerQrScanner } from '../../components/qr/FloatingQrButton';

// Type Definitions
export interface InspectionTask {
    taskId: number;
    taskCode: string;
    machineId: number;
    machineCode: string;
    machineName: string;
    activity: string;
    scheduledDate: string; // Format: YYYY-MM-DD
    endDate: string | null ;
    location: string;
    status: 'DUE' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED' | 'IN_PROGRESS';
    inspectorName?: string;
    completedAt?: string;
    assignedUserId?: number | null;
    // Provenance: CONDITION = task lanjutan lvl 2 hasil kondisi trigger.
    formLevel?: number | null;
    originType?: 'SCHEDULE' | 'CONDITION';
    sourceTaskId?: number | null;
    sourceTaskCode?: string | null;
    sourceFormTitle?: string | null;
    conditionCode?: string | null;
    // Gate PIC: false = user login bukan penanggung jawab mesin pemilik task.
    canWork?: boolean;
    picNames?: string;
}

type OriginFilter = 'ALL' | 'ROUTINE' | 'FOLLOW_UP';

interface InspectionCalendarData {
    year: number;
    month: number;
    daysInMonth: number;
    daysInWeek: number; // 0: Senin, 6: Minggu
    today: string;
    tasks: InspectionTask[];
}

interface TasksIndexProps {
    calendarData?: InspectionCalendarData;
}



export default function TasksIndex({ calendarData }: TasksIndexProps) {
    const currentUserId = (usePage().props.auth as any)?.user?.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const currentCalendarData: InspectionCalendarData = calendarData || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        daysInMonth: new Date().getDate(),
        daysInWeek: new Date().getDay(),
        today: todayStr,
        tasks: []
    }
    
    const [scannedInput, setScannedInput] = useState('');
    const [scanError, setScanError] = useState<string | null>(null);
    const [currentYear, setCurrentYear] = useState(currentCalendarData.year);
    const [currentMonth, setCurrentMonth] = useState(currentCalendarData.month);
    const [selectedDate, setSelectedDate] = useState<string>(currentCalendarData.today);
    const [selectedTaskForModal, setSelectedTaskForModal] = useState<InspectionTask | null>(null);
    const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');

    const isFollowUp = (task: InspectionTask) => task.originType === 'CONDITION';

    // Filter asal task dipakai bersama oleh kalender dan panel detail supaya jumlah
    // titik/counter di kalender tidak melebihi daftar yang tampil.
    const visibleTasks = currentCalendarData.tasks.filter((t) => {
        if (originFilter === 'ROUTINE') return !isFollowUp(t);
        if (originFilter === 'FOLLOW_UP') return isFollowUp(t);
        return true;
    });

    const followUpCount = currentCalendarData.tasks.filter(isFollowUp).length;


    const handleVerifyAndStart = (task: InspectionTask, scannedCode: string) => {
        // Validasi kecocokan QR code fisik dengan kode mesin di task
        if (scannedCode.trim().toUpperCase() !== task.machineCode.trim().toUpperCase()) {
            setScanError(`QR Code tidak valid! Anda menscan "${scannedCode}", tapi mesin yang benar adalah "${task.machineCode}".`);
            return;
        }

        // Jika cocok, bersihkan error dan arahkan ke halaman form inspeksi
        setScanError(null);
        setSelectedTaskForModal(null);
        router.visit(`/inspection-form/${task.taskId}`);
    };
    // Filter Task berdasarkan Tanggal Terpilih
   const isTaskOnDate = (task: InspectionTask, dateStr: string, todayStr: string) => {
    // COMPLETED: hanya di tanggal scheduledDate
    if (task.status === 'COMPLETED') {
        return task.scheduledDate === dateStr;
    }

    // Tanpa end_date: hanya di scheduledDate
    if (!task.endDate) {
        return task.scheduledDate === dateStr;
    }

    // OVERDUE: hanya muncul di hari ini saja (keterlambatan adalah kondisi SEKARANG)
    if (task.status === 'OVERDUE') {
        return dateStr === todayStr;
    }

    // DUE / IN_PROGRESS / UPCOMING: rentang normal
    return dateStr >= task.scheduledDate && dateStr <= task.endDate;
};

    const tasksForSelectedDate = visibleTasks.filter((t) => isTaskOnDate(t, selectedDate, currentCalendarData.today));

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

    const getBadgeClass = (status: InspectionTask['status'] | 'IN_PROGRESS') => {
        switch (status) {
            case 'DUE':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'OVERDUE':
                return 'bg-rose-100 text-rose-800 border-rose-200';
                case 'IN_PROGRESS':
                    return 'bg-indigo-100 text-indigo-800 border-indigo-200'; // 🚀 Badge khusus In Progress
                    case 'COMPLETED':
                        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'UPCOMING':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    function daysLeft(endDate: string, fromDate?: string): number {
        const end = new Date(endDate);
        const ref = fromDate ? new Date(fromDate) : new Date();
        ref.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return Math.ceil((end.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Task lanjutan digambar sebagai diamond oranye supaya langsung beda dari task rutin.
    const getTaskDotClass = (task: InspectionTask) => {
        if (isFollowUp(task)) return 'rotate-45 rounded-[1px] bg-orange-500';

        const color =
            task.status === 'OVERDUE'
                ? 'bg-rose-500'
                : task.status === 'DUE'
                    ? 'bg-amber-500'
                    : task.status === 'IN_PROGRESS'
                        ? 'bg-indigo-500'
                        : task.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500';

        return `rounded-full ${color}`;
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
        for (let i = 0; i < currentCalendarData.daysInWeek; i++) {
            days.push(<div key={`blank-${i}`} className="min-h-[50px] bg-transparent" />);
        }

        // 3. Tanggal-tanggal Bulan
        for (let day = 1; day <= currentCalendarData.daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = visibleTasks.filter((t) => isTaskOnDate(t, dateStr, currentCalendarData.today));
            const isToday = dateStr === currentCalendarData.today;
            const isSelected = dateStr === selectedDate;

            days.push(
                <button
    type="button"
    onClick={() => setSelectedDate(dateStr)}
    className={`min-h-[52px] sm:min-h-[58px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border text-left flex flex-col justify-between transition-all relative ${
        isSelected
            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
            : isToday
                ? 'bg-blue-50/60 border-blue-300 text-slate-900 font-bold'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
    }`}
>
    <span className="text-[11px] sm:text-xs font-extrabold">{day}</span>

    {dayTasks.length > 0 && (
        <div className="flex items-center justify-between w-full mt-0.5 sm:mt-1 gap-0.5">
            <div className="flex items-center gap-0.5 sm:gap-1">
                {dayTasks.slice(0, 3).map((t, idx) => (
                    <span
                        key={idx}
                        className={`w-1 h-1 sm:w-1.5 sm:h-1.5 ${getTaskDotClass(t)}`}
                    />
                ))}
            </div>
            <span
                className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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
            <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kalender Pemeriksaan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Jadwal preventive inspection L1/L2. Pilih tanggal pada kalender untuk melihat task aktif.
        </p>
    </div>

                {/* Filter asal task: berlaku untuk kalender sekaligus panel detail */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tampilkan</span>
                    {([
                        ['ALL', 'Semua'],
                        ['ROUTINE', 'Rutin'],
                        ['FOLLOW_UP', `Lanjutan${followUpCount > 0 ? ` (${followUpCount})` : ''}`],
                    ] as [OriginFilter, string][]).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setOriginFilter(value)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                originFilter === value
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar & Task Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. Panel Kalender Bulanan (Left - 7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    {/* Toolbar Kalender */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
    <button
        type="button"
        onClick={handlePrevMonth}
        className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold transition-colors"
        aria-label="Bulan sebelumnya"
    >
        &lsaquo;
    </button>

    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 min-w-0 flex-1 justify-center">
        <h2 className="text-sm sm:text-base font-black text-slate-900 capitalize truncate text-center">
            {getMonthLabel(currentMonth, currentYear)}
        </h2>
        <button
            type="button"
            onClick={() => setSelectedDate(currentCalendarData.today)}
            className="text-[11px] sm:text-xs font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0"
        >
            Hari Ini
        </button>
    </div>

    <button
        type="button"
        onClick={handleNextMonth}
        className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold transition-colors"
        aria-label="Bulan berikutnya"
    >
        &rsaquo;
    </button>
</div>

                    {/* Render Kalender */}
                    {renderCalendarDays()}

                    <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold mt-4 pt-3 border-t border-slate-100 flex-wrap">
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 inline-block" /> Due</span>
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 inline-block" /> Overdue</span>
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 inline-block" /> Upcoming</span>
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500 inline-block" /> In Progress</span> {/* 🚀 Tambahan */}
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 inline-block" /> Completed</span>
                        <span className="flex items-center gap-1 sm:gap-1.5"><i className="w-1.5 h-1.5 sm:w-2 sm:h-2 rotate-45 rounded-[1px] bg-orange-500 inline-block" /> Lanjutan</span>
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
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[60vh] sm:max-h-[500px] pr-1">
                        {tasksForSelectedDate.length > 0 ? (
                            tasksForSelectedDate.map((t) => (
                                <div
                                    key={t.taskId}
                                    className={`p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white transition-all border-l-4 ${
    t.status === 'OVERDUE'
        ? 'border-l-rose-500'
        : t.status === 'DUE'
            ? 'border-l-amber-500'
            : t.status === 'IN_PROGRESS'
                ? 'border-l-indigo-500'
                : t.status === 'COMPLETED'
                    ? 'border-l-emerald-500'
                    : 'border-l-blue-500'
}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(t.status)}`}>
            {t.status}
        </span>
        {isFollowUp(t) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-orange-100 text-orange-800 border-orange-200 tracking-wider">
                LANJUTAN
            </span>
        )}
    </div>
    <span className="text-[10px] font-mono text-slate-400 truncate shrink-0 max-w-[45%] text-right">{t.taskCode}</span>
</div>

                                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{t.activity}</h4>

                                    {isFollowUp(t) && (
                                        <p className="mt-1 text-[11px] font-semibold text-orange-700 leading-snug">
                                            Lanjutan dari {t.sourceFormTitle || 'inspeksi sebelumnya'}
                                            <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                                                {t.sourceTaskCode || '-'}
                                                {t.conditionCode ? ` \u00b7 ${t.conditionCode}` : ''}
                                            </span>
                                        </p>
                                    )}

                                    <div className="mt-2 text-xs text-slate-600 font-bold">
                                            {t.machineName}
                                        <span className="block text-[11px] text-slate-400 mt-0.5">{t.machineCode} &bull; {t.location}</span>
                                    </div>

                                    {t.endDate && t.status !== 'COMPLETED' && (() => {
    const days = daysLeft(t.endDate, currentCalendarData.today);
    const isLate = t.status === 'OVERDUE' || days < 0;
    const lateDays = Math.abs(days);
    const showBadge = t.status !== 'UPCOMING';

    return (
        <div className="mt-2 text-[11px] font-semibold text-slate-600 flex items-center gap-1 flex-wrap">
            <span className="text-slate-400">Batas akhir:</span>
            <span className="text-slate-900">
                {new Intl.DateTimeFormat('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric'
                }).format(new Date(t.endDate))}
            </span>
            {showBadge && (isLate ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Terlambat {lateDays} hari
                </span>
            ) : days === 0 ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    Berakhir pukul 23:59
                </span>
            ) : (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Sisa {days} hari
                </span>
            ))}
        </div>
    );
})()}

                                    {t.status !== 'COMPLETED' && (
                                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-slate-600">Petugas:</span>
                                            <span className="text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                                {t.inspectorName || 'Semua PIC Mesin'}
                                            </span>
                                        </div>
                                    )}

                                    {t.completedAt && (
                                        <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                                            Selesai oleh {t.inspectorName} jam {t.completedAt}
                                        </p>
                                    )}

                                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-end gap-2">
                                        {(() => {
                                            // Ambil ID user yang sedang login dari Inertia props
                                            const isAssignedToOther = t.assignedUserId && t.assignedUserId !== currentUserId;

                                            if (t.status === 'COMPLETED') {
                                                return (
                                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-full text-center">
                                                        Inspeksi Selesai ✓
                                                    </span>
                                                );
                                            }

                                            // 🛑 Task UPCOMING belum bisa dikerjakan siapapun sampai jadwal tiba
                                            if (t.status === 'UPCOMING') {
                                                return (
                                                    <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg w-full text-center">
                                                        Jadwal Belum Dimulai
                                                    </span>
                                                );
                                            }

                                            // 🛑 Bukan PIC mesin / bukan PIC yang ditargetkan
                                            if (t.canWork === false) {
                                                return (
                                                    <div className="w-full py-2 px-3 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg text-center">
                                                        ⛔ Hanya PIC yang ditugaskan yang boleh mengerjakan
                                                        {t.picNames ? (
                                                            <span className="block font-normal text-[10px] mt-0.5 text-rose-700 break-words">
                                                                PIC: {t.picNames}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                );
                                            }

                                            // 🛑 Jika task SEDANG DIKERJAKAN oleh teknisi lain (status IN_PROGRESS)
                                            if (isAssignedToOther && t.status === 'IN_PROGRESS') {
                                                return (
                                                    <div className="w-full py-2 px-3 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-center">
                                                        ⚠️ Sedang dikerjakan oleh {t.inspectorName || 'Teknisi Lain'}
                                                    </div>
                                                );
                                            }

                                            // ⚠️ OVERDUE: wajib scan QR fisik mesin terlebih dahulu
                                            if (t.status === 'OVERDUE') {
                                                const lateDays = t.endDate ? Math.abs(daysLeft(t.endDate, selectedDate)) : null;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            triggerQrScanner({
                                                                expectedMachineCode: t.machineCode,
                                                                targetTaskId: t.taskId,
                                                                machineName: t.machineName,
                                                                activity: t.activity,
                                                            })
                                                        }
                                                        className="w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg text-center transition-colors cursor-pointer shadow-sm"
                                                    >
                                                        {lateDays !== null
                                                            ? `⚠️ Scan QR & Kerjakan (Terlambat ${lateDays} hari)`
                                                            : '⚠️ Scan QR & Kerjakan (Terlambat)'}
                                                    </button>
                                                );
                                            }

                                            // Wajib scan QR fisik mesin saat mulai maupun melanjutkan task IN_PROGRESS
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        triggerQrScanner({
                                                            expectedMachineCode: t.machineCode,
                                                            targetTaskId: t.taskId,
                                                            machineName: t.machineName,
                                                            activity: t.activity,
                                                        })
                                                    }
                                                    className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg text-center transition-colors cursor-pointer shadow-sm"
                                                >
                                                    {t.status === 'IN_PROGRESS' ? 'Scan QR & Lanjutkan Inspeksi' : 'Scan QR & Mulai Inspeksi'}
                                                </button>
                                            );
                                        })()}
                                    </div>
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
        </AppLayout>
    );
}