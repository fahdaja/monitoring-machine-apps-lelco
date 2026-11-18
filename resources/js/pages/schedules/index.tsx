import React, { useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Calendar, Clock, FileText, Settings, Trash2, RefreshCw, Power, Edit3, Zap, ArrowRight } from 'lucide-react';

interface FormItem {
    id: number;
    form_title: string;
    form_code: string;
    machine_name?: string;
    form_level?: number | null;
}

interface ScheduleItem {
    id: number;
    form: FormItem;
    frequency_type: string;
    selected_days?: string[];
    selected_dates?: number[];
    due_window_days?: number;
    is_active: boolean;
}

interface ConditionItem {
    id: number;
    condition_code: string;
    trigger_form?: { id: number; form_title: string; form_code: string; machine_name?: string } | null;
    trigger_question?: { id: number; question_text: string } | null;
    trigger_option?: { id: number; option_text: string; is_normal?: boolean } | null;
    target_form?: { id: number; form_title: string; form_code: string; machine_name?: string } | null;
    due_window_days?: number;
    is_active: boolean;
}

interface QuestionItem {
    id: number;
    question_text: string;
    input_type: string;
    options: { id: number; option_text: string; is_normal?: boolean }[];
}

interface Props {
    schedules: ScheduleItem[];
    forms: FormItem[];
    conditions: ConditionItem[];
}

const DAYS_OF_WEEK = [
    { value: '1', label: 'Senin' },
    { value: '2', label: 'Selasa' },
    { value: '3', label: 'Rabu' },
    { value: '4', label: 'Kamis' },
    { value: '5', label: 'Jumat' },
    { value: '6', label: 'Sabtu' },
    { value: '7', label: 'Minggu' },
];

export default function ScheduleIndex({ schedules, forms, conditions }: Props) {
    const { auth } = usePage<any>().props;
    const isAdmin = auth?.user?.role?.toUpperCase() === 'ADMIN';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

    // State form pengaturan jadwal
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        form_id: '',
        frequency_type: 'DAILY',
        due_window_days: '1',
        selected_days: [] as string[],
        selected_dates: [] as number[],
    });

    // State kondisi trigger (lvl 1 -> lvl 2)
    const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
    const [editingCondition, setEditingCondition] = useState<ConditionItem | null>(null);
    const [conditionQuestions, setConditionQuestions] = useState<QuestionItem[]>([]);

    const {
        data: condData,
        setData: setCondData,
        post: postCondition,
        put: putCondition,
        processing: condProcessing,
        errors: condErrors,
        reset: resetCond,
        clearErrors: clearCondErrors,
    } = useForm({
        trigger_form_id: '',
        trigger_question_id: '',
        trigger_option_id: '',
        target_form_id: '',
        due_window_days: '1',
    });

    const selectedConditionQuestion = conditionQuestions.find(
        (q) => q.id.toString() === condData.trigger_question_id
    );

    // Ambil pertanyaan + opsi milik form trigger (hanya pertanyaan berpilihan)
    const loadConditionQuestions = (formId: string) => {
        setConditionQuestions([]);
        if (!formId) return;
        fetch(`/schedules/condition-questions/${formId}`)
            .then((res) => res.json())
            .then((data) => setConditionQuestions(data))
            .catch(() => setConditionQuestions([]));
    };

    // Buka Modal untuk Buat Baru
    const openCreateModal = () => {
        setEditingSchedule(null);
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    // Buka Modal untuk Edit
    const openEditModal = (sch: ScheduleItem) => {
        setEditingSchedule(sch);
        setData({
            form_id: sch.form?.id.toString() || '',
            frequency_type: sch.frequency_type,
            due_window_days: sch.due_window_days?.toString() || '1',
            selected_days: sch.selected_days || [],
            selected_dates: sch.selected_dates || [],
        });
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSchedule(null);
        reset();
        clearErrors();
    };

    // ===== Kondisi trigger (lvl 1 -> lvl 2) =====
    const openCreateConditionModal = () => {
        setEditingCondition(null);
        resetCond();
        setConditionQuestions([]);
        clearCondErrors();
        setIsConditionModalOpen(true);
    };

    const openEditConditionModal = (cond: ConditionItem) => {
        setEditingCondition(cond);
        setCondData({
            trigger_form_id: cond.trigger_form?.id.toString() || '',
            trigger_question_id: cond.trigger_question?.id.toString() || '',
            trigger_option_id: cond.trigger_option?.id.toString() || '',
            target_form_id: cond.target_form?.id.toString() || '',
            due_window_days: cond.due_window_days?.toString() || '1',
        });
        loadConditionQuestions(cond.trigger_form?.id.toString() || '');
        clearCondErrors();
        setIsConditionModalOpen(true);
    };

    const closeConditionModal = () => {
        setIsConditionModalOpen(false);
        setEditingCondition(null);
        resetCond();
        setConditionQuestions([]);
        clearCondErrors();
    };

    const submitCondition = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCondition) {
            putCondition(`/schedule-conditions/${editingCondition.id}`, {
                onSuccess: () => closeConditionModal(),
            });
        } else {
            postCondition('/schedule-conditions', {
                onSuccess: () => closeConditionModal(),
            });
        }
    };

    // Backend langsung membalik status, body dikosongkan.
    const toggleConditionStatus = (id: number) => {
        router.patch(`/schedule-conditions/${id}/toggle`, {}, { preserveScroll: true });
    };

    const deleteCondition = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus kondisi trigger ini secara permanen? Task yang sudah terlanjur dibuat tidak akan terhapus.')) {
            router.delete(`/schedule-conditions/${id}`, { preserveScroll: true });
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSchedule) {
            // Mode Edit (Versioning: Matikan lama, buat baru)
            put(`/schedules/${editingSchedule.id}`, {
                onSuccess: () => closeModal(),
            });
        } else {
            // Mode Create
            post('/schedules', {
                onSuccess: () => closeModal(),
            });
        }
    };

    const toggleDay = (dayVal: string) => {
        const exists = data.selected_days.includes(dayVal);
        if (exists) {
            setData('selected_days', data.selected_days.filter(d => d !== dayVal));
        } else {
            setData('selected_days', [...data.selected_days, dayVal]);
        }
    };

    const toggleDateNum = (dateNum: number) => {
        const exists = data.selected_dates.includes(dateNum);
        if (exists) {
            setData('selected_dates', data.selected_dates.filter(d => d !== dateNum));
        } else {
            setData('selected_dates', [...data.selected_dates, dateNum].sort((a, b) => a - b));
        }
    };

    // Konversi JS getDay() (Minggu=0..Sabtu=6) ke ISO (Senin=1..Minggu=7),
    // agar cocok dengan konvensi DAYS_OF_WEEK & dayOfWeekIso di backend.
    const isoDayOfWeek = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

    const dateFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

    // Senin pada minggu DEPAN (kalender ISO), sama seperti backend.
    const nextWeekMonday = (): Date => {
        const today = new Date();
        const d = new Date(today);
        d.setDate(today.getDate() + (8 - isoDayOfWeek(today)));
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Preview: hari terpilih yang jatuh pada minggu depan (Senin-Minggu).
    const weeklyPreview = (): string[] => {
        const base = nextWeekMonday();
        const out: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            if (data.selected_days.includes(String(isoDayOfWeek(d)))) {
                out.push(dateFmt.format(d));
            }
        }
        return out;
    };

    // Jumlah hari pada bulan depan (untuk deteksi tanggal yang tidak ada, mis. 31 di Feb).
    const nextMonthLastDay = (): number => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
    };

    // Preview: tanggal terpilih pada BULAN DEPAN (hanya tanggal yang benar ada).
    const monthlyPreview = (): string[] => {
        const today = new Date();
        const lastDay = nextMonthLastDay();
        const out: string[] = [];
        for (let day = 1; day <= lastDay; day++) {
            const d = new Date(today.getFullYear(), today.getMonth() + 1, day);
            if (data.selected_dates.includes(d.getDate())) {
                out.push(dateFmt.format(d));
            }
        }
        return out;
    };

    // Tanggal terpilih yang tidak ada di bulan depan (mis. 29-31 saat bulan pendek).
    const monthlySkipped = (): number[] => {
        const lastDay = nextMonthLastDay();
        return data.selected_dates.filter((x) => x > lastDay).sort((a, b) => a - b);
    };

    // Fungsi untuk mengubah status AKTIF / NONAKTIF
    const toggleStatus = (id: number, currentStatus: boolean) => {
        router.patch(`/schedules/${id}/toggle`, {
            is_active: !currentStatus
        }, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title="Pengaturan Pola Jadwal" />

            <div className="space-y-6 pb-12">
                {/* HEADER HALAMAN */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                            <Settings className="w-6 h-6 text-slate-700" />
                            Pengaturan Pola Jadwal
                        </h1>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
                            Atur pola jadwal (Harian/Mingguan/Bulanan). Sistem akan secara otomatis membuat daftar tugas (task) di latar belakang sesuai pola ini.
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={openCreateModal}
                            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                        >
                            + Buat Pengaturan Baru
                        </button>
                    )}
                </div>

                {/* PERINGATAN GENERATE OTOMATIS */}
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <span className="text-base leading-none">&#9888;</span>
                    <p className="text-[11px] sm:text-xs text-amber-800 font-semibold leading-relaxed">
                        Setiap hari pukul <span className="font-extrabold">00:00</span> sistem otomatis membuat task dari jadwal yang aktif.
                        Task yang <span className="font-extrabold">sudah ter-generate tidak bisa dibatalkan/dihapus otomatis</span>.
                        Pastikan pengaturan jadwal sudah sesuai keinginan sebelum tengah malam.
                    </p>
                </div>

                {/* LIST JADWAL (CARD VIEW) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedules && schedules.length > 0 ? (
                        schedules.map((sch) => (
                            <div key={sch.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-sm text-slate-900 truncate" title={sch.form?.form_title}>
                                                {sch.form?.form_title || 'Form Terhapus'}
                                            </h3>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sch.form?.form_code}</p>
                                        </div>

                                        {/* Tombol Toggle AKTIF / NONAKTIF */}
                                        <button
                                            type="button"
                                            onClick={() => toggleStatus(sch.id, sch.is_active)}
                                            className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${sch.is_active
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                                }`}
                                            title="Klik untuk mengubah status"
                                        >
                                            <Power className="w-3 h-3" />
                                            {sch.is_active ? 'AKTIF' : 'NONAKTIF'}
                                        </button>
                                    </div>

                                    <div className="space-y-2 mt-4 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Mesin:</span>
                                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 rounded-md">
                                                {sch.form?.machine_name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Frekuensi:</span>
                                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 rounded-md">
                                                {sch.frequency_type}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Tenggat:</span>
                                            <span className="font-medium text-slate-800">
                                                {sch.due_window_days} Hari
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm('Apakah Anda yakin ingin menghapus pengaturan jadwal ini secara permanen? Data task yang sudah terlanjur dibuat tidak akan terhapus.')) {
                                                router.delete(`/schedules/${sch.id}`, {
                                                    preserveScroll: true,
                                                });
                                            }
                                        }}
                                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                                    </button>
                                    <div className="flex gap-2">
    {/* TOMBOL EDIT */}
    <button 
        type="button" 
        onClick={() => openEditModal(sch)}
        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
    >
        <Edit3 className="w-3 h-3" /> Edit
    </button>
</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                            <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-bold text-slate-700 mb-1">Belum ada pengaturan jadwal</p>
                            <p className="text-xs">Silakan klik "Buat Pengaturan Baru" untuk mulai mengatur pola.</p>
                        </div>
                    )}
                </div>

                {/* SECTION KONDISI TRIGGER (LEVEL FORM INSPECTION) */}
                <div className="pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                Kondisi Trigger Level Inspeksi
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 max-w-2xl">
                                Hubungkan form inspeksi lvl 1 dengan form inspeksi lvl 2. Saat task lvl 1 disubmit dengan jawaban trigger yang dipilih, sistem otomatis membuat task untuk form lvl 2 dengan tenggat keesokan harinya.
                            </p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateConditionModal}
                                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                            >
                                + Buat Kondisi Baru
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {conditions && conditions.length > 0 ? (
                            conditions.map((cond) => (
                                <div key={cond.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Form Trigger (Lvl 1)</p>
                                                <h3 className="font-bold text-sm text-slate-900 truncate" title={cond.trigger_form?.form_title}>
                                                    {cond.trigger_form?.form_title || 'Form Terhapus'}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cond.trigger_form?.form_code}</p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => toggleConditionStatus(cond.id)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 border transition-colors cursor-pointer flex items-center gap-1 ${cond.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                                    }`}
                                                title="Klik untuk mengubah status"
                                            >
                                                <Power className="w-3 h-3" />
                                                {cond.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </button>
                                        </div>

                                        <div className="space-y-2 mt-4 text-xs">
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0"><FileText className="w-3 h-3" /> Pertanyaan:</span>
                                                <span className="font-semibold text-slate-800 text-right truncate" title={cond.trigger_question?.question_text}>
                                                    {cond.trigger_question?.question_text || '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0"><Zap className="w-3 h-3" /> Jawaban trigger:</span>
                                                <span className={`font-semibold px-2 rounded-md shrink-0 ${cond.trigger_option?.is_normal === false ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
                                                    {cond.trigger_option?.option_text || '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-slate-500 flex items-center gap-1 shrink-0"><ArrowRight className="w-3 h-3" /> Lanjutan (Lvl 2):</span>
                                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 rounded-md text-right truncate" title={cond.target_form?.form_title}>
                                                    {cond.target_form?.form_title || 'Form Terhapus'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Tenggat:</span>
                                                <span className="font-medium text-slate-800">
                                                    {cond.due_window_days} Hari (besok)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm('Apakah Anda yakin ingin menghapus kondisi trigger ini secara permanen? Task yang sudah terlanjur dibuat tidak akan terhapus.')) {
                                                    deleteCondition(cond.id);
                                                }
                                            }}
                                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditConditionModal(cond)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                            <Edit3 className="w-3 h-3" /> Edit
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
                                <Zap className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700 mb-1">Belum ada kondisi trigger</p>
                                <p className="text-xs">Buat kondisi agar jawaban tertentu pada inspeksi lvl 1 otomatis membuat task inspeksi lvl 2 besok.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL SETTINGS JADWAL */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-sm sm:text-base font-black text-slate-900">
                                    {editingSchedule ? 'Edit Pola Jadwal' : 'Buat Pengaturan Pola Jadwal'}
                                </h3>
                                <button onClick={closeModal} className="text-slate-400 hover:text-rose-600 font-bold text-lg">&times;</button>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Template Form *</label>
                                    <select
                                        value={data.form_id}
                                        onChange={e => setData('form_id', e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!!editingSchedule}
                                    >
                                        <option value="">-- Pilih Form Inspeksi --</option>
                                        {forms.filter((f) => f.form_level !== 2).map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.form_title}{f.form_level === 1 ? ' — Lvl 1' : ''} {f.machine_name ? `${f.machine_name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {editingSchedule && <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Form tidak dapat diubah. Buat jadwal baru untuk form lain.</span>}
                                    {errors.form_id && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{errors.form_id}</span>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Frekuensi *</label>
                                        <select
                                            value={data.frequency_type}
                                            onChange={e => {
                                                setData(prev => ({
                                                    ...prev,
                                                    frequency_type: e.target.value,
                                                    selected_days: [],
                                                    selected_dates: [],
                                                }));
                                            }}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        >
                                            <option value="DAILY">DAILY (Setiap Hari)</option>
                                            <option value="WEEKLY">WEEKLY (Mingguan)</option>
                                            <option value="MONTHLY">MONTHLY (Bulanan)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Batas Tenggat (Hari) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.due_window_days}
                                            onChange={e => setData('due_window_days', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {errors.due_window_days && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{errors.due_window_days}</span>}
                                    </div>
                                </div>

                                {data.frequency_type === 'WEEKLY' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="block text-xs font-bold text-slate-700">Pilih Hari (berulang tiap minggu) *</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {DAYS_OF_WEEK.map((d) => {
                                                const active = data.selected_days.includes(d.value);
                                                return (
                                                    <button
                                                        key={d.value}
                                                        type="button"
                                                        onClick={() => toggleDay(d.value)}
                                                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-colors cursor-pointer ${active
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        {d.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {data.selected_days.length === 0 && (
                                            <span className="text-[10px] text-rose-600 font-semibold block">Pilih minimal satu hari.</span>
                                        )}
                                        {data.selected_days.length > 0 && (
                                            <div className="pt-1">
                                                <p className="text-[10px] font-bold text-slate-500">Akan dibuat task setiap minggu pada:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {weeklyPreview().map((label) => (
                                                        <span key={label} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">{label}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {data.frequency_type === 'MONTHLY' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="block text-xs font-bold text-slate-700">Pilih Tanggal *</label>
                                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((num) => {
                                                const active = data.selected_dates.includes(num);
                                                return (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => toggleDateNum(num)}
                                                        className={`py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold border transition-colors ${active
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-pointer'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                                                            }`}
                                                    >
                                                        {num}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {data.selected_dates.length === 0 && (
                                            <span className="text-[10px] text-rose-600 font-semibold block">Pilih minimal satu tanggal.</span>
                                        )}
                                        {data.selected_dates.length > 0 && (
                                            <div className="space-y-1 pt-1">
                                                <p className="text-[10px] font-bold text-slate-500">Akan digenerate untuk bulan depan:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {monthlyPreview().map((label, idx) => (
                                                        <span key={`${label}-${idx}`} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">{label}</span>
                                                    ))}
                                                </div>
                                                {monthlySkipped().length > 0 && (
                                                    <p className="text-[10px] text-amber-600 font-semibold">&#9888; Tanggal {monthlySkipped().join(', ')} tidak ada di bulan depan, jadi tidak akan dibuat task-nya.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {processing ? 'Menyimpan...' : (editingSchedule ? 'Simpan Perubahan' : 'Simpan Pola Jadwal')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL KONDISI TRIGGER */}
                {isConditionModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-sm sm:text-base font-black text-slate-900">
                                    {editingCondition ? 'Edit Kondisi Trigger' : 'Buat Kondisi Trigger Baru'}
                                </h3>
                                <button onClick={closeConditionModal} className="text-slate-400 hover:text-rose-600 font-bold text-lg">&times;</button>
                            </div>

                            <form onSubmit={submitCondition} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Template Form Trigger (Lvl 1) *</label>
                                    <select
                                        value={condData.trigger_form_id}
                                        onChange={(e) => {
                                            setCondData(prev => ({ ...prev, trigger_form_id: e.target.value, trigger_question_id: '', trigger_option_id: '' }));
                                            loadConditionQuestions(e.target.value);
                                        }}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- Pilih Form Inspeksi Lvl 1 --</option>
                                        {forms.filter((f) => f.form_level === 1).map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.form_title} {f.machine_name ? `(${f.machine_name})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {condErrors.trigger_form_id && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{condErrors.trigger_form_id}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Pertanyaan Trigger *</label>
                                    <select
                                        value={condData.trigger_question_id}
                                        onChange={(e) => setCondData(prev => ({ ...prev, trigger_question_id: e.target.value, trigger_option_id: '' }))}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!condData.trigger_form_id}
                                    >
                                        <option value="">-- Pilih Pertanyaan --</option>
                                        {conditionQuestions.map((q) => (
                                            <option key={q.id} value={q.id}>
                                                {q.question_text}
                                            </option>
                                        ))}
                                    </select>
                                    {condData.trigger_form_id && conditionQuestions.length === 0 && (
                                        <span className="text-[10px] text-amber-600 font-semibold mt-1 block">Form ini tidak punya pertanyaan berpilihan (SELECT/CHECKBOX/DROPDOWN).</span>
                                    )}
                                    {condErrors.trigger_question_id && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{condErrors.trigger_question_id}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Jawaban Trigger *</label>
                                    <select
                                        value={condData.trigger_option_id}
                                        onChange={(e) => setCondData('trigger_option_id', e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                                        disabled={!condData.trigger_question_id}
                                    >
                                        <option value="">-- Pilih Jawaban --</option>
                                        {(selectedConditionQuestion?.options || []).map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.option_text}{o.is_normal === false ? ' (Abnormal)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {condErrors.trigger_option_id && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{condErrors.trigger_option_id}</span>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Template Form Lanjutan (Lvl 2) *</label>
                                        <select
                                            value={condData.target_form_id}
                                            onChange={(e) => setCondData('target_form_id', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        >
                                            <option value="">-- Pilih Form Inspeksi Lvl 2 --</option>
                                            {forms.filter((f) => f.form_level === 2 && f.id.toString() !== condData.trigger_form_id).map((f) => (
                                                <option key={f.id} value={f.id}>
                                                    {f.form_title} {f.machine_name ? `(${f.machine_name})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {condErrors.target_form_id && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{condErrors.target_form_id}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Batas Tenggat (Hari) *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={condData.due_window_days}
                                            onChange={(e) => setCondData('due_window_days', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {condErrors.due_window_days && <span className="text-[10px] text-rose-600 font-bold mt-1 block">{condErrors.due_window_days}</span>}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                                    <p className="text-[10px] sm:text-[11px] text-slate-600 font-semibold leading-relaxed">
                                        Saat task dari form trigger disubmit dengan jawaban di atas, sistem otomatis membuat task untuk form lvl 2 dengan tenggat besok. Task tidak dibuat ganda jika sudah ada untuk tanggal tersebut.
                                    </p>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={closeConditionModal}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={condProcessing}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-sm"
                                    >
                                        {condProcessing ? 'Menyimpan...' : (editingCondition ? 'Simpan Perubahan' : 'Simpan Kondisi')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}