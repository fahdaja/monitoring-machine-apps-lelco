import React, { useState } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Calendar, Clock, FileText, Settings, Trash2, RefreshCw, Power, Edit3 } from 'lucide-react';

interface FormItem {
    id: number;
    form_title: string;
    form_code: string;
    machine_type?: string;
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

interface Props {
    schedules: ScheduleItem[];
    forms: FormItem[];
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
                                                {sch.form?.machine_type || 'Umum'}
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

    {/* TOMBOL LIHAT TASK */}
    <Link 
        href={`/schedules/${sch.id}/tasks`} 
        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-[11px]"
    >
        Lihat Task
    </Link>
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
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium"
                                        disabled={!!editingSchedule} // Opsional: Kunci form jika sedang edit
                                    >
                                        <option value="">-- Pilih Form Inspeksi --</option>
                                        {forms.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.form_title} {f.machine_type ? `(${f.machine_type})` : ''}
                                            </option>
                                        ))}
                                    </select>
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
                                        <label className="block text-xs font-bold text-slate-700">Pilih Hari *</label>
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
            </div>
        </AppLayout>
    );
}