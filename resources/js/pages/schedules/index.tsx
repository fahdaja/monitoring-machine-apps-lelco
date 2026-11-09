import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface Machine {
    id: number;
    machine_name: string;
    machine_type?: string;
}

interface FormItem {
    id: number;
    form_title: string;
    form_code: string;
    machine_type?: string;
}

interface ScheduleItem {
    id: number;
    form: FormItem;
    machine?: Machine;
    frequency_type: string;
    start_date: string;
    end_date: string;
    due_window_days?: number;
    is_active: boolean;
    created_at?: string;
}

interface Props {
    schedules: ScheduleItem[];
    forms: FormItem[];
}

interface User {
    id: number;
    full_name: string;
    role: string;
}

interface PageProps {
    auth: {
        user: User;
    };
    [key: string]: any;
}

const DAYS_OF_WEEK = [
    { value: '1', label: 'Senin' },
    { value: '2', label: 'Selasa' },
    { value: '3', label: 'Rabu' },
    { value: '4', label: 'Kamis' },
    { value: '5', label: 'Jumat' },
    { value: '6', label: 'Sabtu' },
    { value: '0', label: 'Minggu' },
];

export default function ScheduleIndex({ schedules, forms }: Props) {
    const { auth } = usePage<PageProps>().props;
    const userRole = auth?.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN';

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Tanggal hari ini format YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, setData, post, processing, errors, reset } = useForm({
        form_id: '',
        frequency_type: 'DAILY',
        start_date: '',
        end_date: '',
        due_window_days: '1',
        selected_days: [] as string[],
        selected_dates: [] as number[],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/schedules', {
            onSuccess: () => {
                reset();
                setIsModalOpen(false);
            },
        });
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

    const calculateEstimatedTasks = () => {
        if (!data.start_date || !data.end_date) return 0;
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const diffTime = end.getTime() - start.getTime();
        if (diffTime < 0) return 0;
        
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (data.frequency_type === 'DAILY') {
            return diffDays;
        } else if (data.frequency_type === 'WEEKLY') {
            if (data.selected_days.length === 0) return 0;
            return Math.round((diffDays / 7) * data.selected_days.length);
        } else if (data.frequency_type === 'MONTHLY') {
            if (data.selected_dates.length === 0) return 0;
            return Math.round((diffDays / 30) * data.selected_dates.length);
        }
        return 0;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AppLayout>
            <Head title="Manajemen Jadwal & Task" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900">Manajemen Jadwal Pemantauan</h1>
                        <p className="text-xs text-slate-500 mt-1">Atur jadwal berkala untuk template form agar task teknisi ter-generate otomatis.</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            + Buat Jadwal Baru
                        </button>
                    )}
                </div>

                {/* Tabel Daftar Schedule */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-4 font-extrabold">Template Form</th>
                                <th className="p-4 font-extrabold">Target Mesin (Form)</th>
                                <th className="p-4 text-center font-extrabold">Frekuensi</th>
                                <th className="p-4 text-center font-extrabold">Periode Mulai</th>
                                <th className="p-4 text-center font-extrabold">Periode Selesai</th>
                                <th className="p-4 text-center font-extrabold">Status</th>
                                <th className="p-4 text-center font-extrabold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schedules && schedules.length > 0 ? (
                                schedules.map((sch) => (
                                    <tr key={sch.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{sch.form?.form_title || 'Form Terhapus'}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{sch.form?.form_code}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold">
                                                {sch.form?.machine_type || 'Umum'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-semibold text-slate-700">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                                                {sch.frequency_type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(sch.start_date)}
                                        </td>
                                        <td className="p-4 text-center text-slate-500 font-medium">
                                            {formatDate(sch.end_date)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sch.is_active ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500'}`}>
                                                {sch.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center space-x-2">
                                            <Link
                                                href={`/schedules/${sch.id}/tasks`}
                                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors inline-block"
                                            >
                                                Lihat Task
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">Belum ada jadwal pemantauan yang dibuat.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal Buat Jadwal Baru */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-base font-black text-slate-900">Buat Jadwal Pemantauan Baru</h3>
                            <form onSubmit={submit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Template Form *</label>
                                    <select
                                        value={data.form_id}
                                        onChange={e => setData('form_id', e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                    >
                                        <option value="">-- Pilih Form Inspeksi --</option>
                                        {forms.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.form_title} {f.machine_type ? `(${f.machine_type})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.form_id && <span className="text-[10px] text-rose-600 font-bold">{errors.form_id}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Frekuensi *</label>
                                        <select
                                            value={data.frequency_type}
                                            onChange={e => {
                                                // Reset state tanggal dan pilihan saat frekuensi diganti agar bersih
                                                setData(prev => ({
                                                    ...prev,
                                                    frequency_type: e.target.value,
                                                    start_date: '',
                                                    end_date: '',
                                                    selected_days: [],
                                                    selected_dates: []
                                                }));
                                            }}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        >
                                            <option value="DAILY">DAILY (Harian)</option>
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
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {errors.due_window_days && <span className="text-[10px] text-rose-600 font-bold">{errors.due_window_days}</span>}
                                    </div>
                                </div>

                                {data.frequency_type === 'WEEKLY' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="block text-xs font-bold text-slate-700">Pilih Hari dalam Seminggu *</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {DAYS_OF_WEEK.map((d) => {
                                                const active = data.selected_days.includes(d.value);
                                                return (
                                                    <button
                                                        key={d.value}
                                                        type="button"
                                                        onClick={() => toggleDay(d.value)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                                            active 
                                                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {d.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {data.frequency_type === 'MONTHLY' && (
    <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-slate-700">Pilih Tanggal dalam Sebulan *</label>
        <div className="grid grid-cols-7 gap-1 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((num) => {
                const active = data.selected_dates.includes(num);

                // Cek apakah tanggal ini sudah lewat dari hari ini (jika start_date adalah hari ini)
                let isDisabled = false;
                if (data.start_date) {
                    const selectedDateObj = new Date(data.start_date);
                    const currentYear = selectedDateObj.getFullYear();
                    const currentMonth = selectedDateObj.getMonth();
                    
                    // Buat objek tanggal untuk angka yang sedang dirender di grid
                    const targetDate = new Date(currentYear, currentMonth, num);
                    const todayObj = new Date();
                    todayObj.setHours(0, 0, 0, 0);

                    // Jika tanggal di grid lebih kecil dari hari ini, disable
                    if (targetDate < todayObj) {
                        isDisabled = true;
                    }
                }

                return (
                    <button
                        key={num}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && toggleDateNum(num)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            isDisabled 
                                ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' 
                                : active 
                                    ? 'bg-emerald-600 text-white border-emerald-600 cursor-pointer' 
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                        }`}
                    >
                        {num}
                    </button>
                );
            })}
        </div>
        {data.selected_dates.length === 0 && <span className="text-[10px] text-rose-600 font-semibold block">Pilih minimal satu tanggal.</span>}
    </div>
)}

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai *</label>
                                        <input
                                            type="date"
                                            min={todayStr}
                                            value={data.start_date}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setData('start_date', val);
                                                if (data.end_date && data.end_date < val) {
                                                    setData('end_date', '');
                                                }
                                            }}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                        {errors.start_date && <span className="text-[10px] text-rose-600 font-bold">{errors.start_date}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Selesai *</label>
                                        <input
                                            type="date"
                                            min={data.start_date || todayStr}
                                            disabled={!data.start_date}
                                            value={data.end_date}
                                            onChange={e => setData('end_date', e.target.value)}
                                            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                        />
                                        {errors.end_date && <span className="text-[10px] text-rose-600 font-bold">{errors.end_date}</span>}
                                    </div>
                                </div>

                                {data.start_date && data.end_date && calculateEstimatedTasks() > 0 && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-center justify-between">
                                        <span className="text-slate-500">Estimasi Task:</span>
                                        <span className="font-bold text-slate-900 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
                                            {calculateEstimatedTasks()} Task ({data.frequency_type})
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold border text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                    >
                                        Simpan & Generate Task
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