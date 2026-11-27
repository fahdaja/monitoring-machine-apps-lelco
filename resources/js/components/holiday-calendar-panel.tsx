import React, { useMemo, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { CalendarOff, Trash2 } from 'lucide-react';

export interface HolidayItem {
    id: number;
    holiday_date: string;
    name: string;
}

const fmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Kalender kerja: daftar hari libur nasional / cuti bersama / hari besar.
 * Jadwal yang mengaktifkan "Lewati hari libur" tidak membuat task pada tanggal ini.
 */
export default function HolidayCalendarPanel({ holidays = [] }: { holidays: HolidayItem[] }) {
    const today = new Date().toISOString().split('T')[0];
    const [showPast, setShowPast] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        holiday_date: '',
        end_date: '',
        name: '',
    });

    const visible = useMemo(
        () => holidays.filter((h) => showPast || h.holiday_date >= today),
        [holidays, showPast, today],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/holidays', {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const remove = (h: HolidayItem) => {
        if (!confirm(`Hapus hari libur "${h.name}" (${h.holiday_date})? Task jadwal untuk tanggal tersebut akan dibuat ulang bila masih dalam jangkauan.`)) return;
        router.delete(`/holidays/${h.id}`, { preserveScroll: true });
    };

    const inputCls =
        'w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium';

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <CalendarOff className="w-5 h-5 text-rose-600" />
                        Kalender Kerja — Hari Libur
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Libur nasional, cuti bersama, atau hari besar perusahaan. Jadwal dengan opsi <strong>Lewati hari libur</strong> tidak
                        membuat task pada tanggal ini; task UPCOMING yang sudah terlanjur dibuat untuk tanggal tersebut otomatis dibatalkan.
                    </p>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer shrink-0">
                    <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="rounded w-3.5 h-3.5" />
                    Tampilkan yang sudah lewat
                </label>
            </div>

            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tanggal *</label>
                    <input type="date" value={data.holiday_date} onChange={(e) => setData('holiday_date', e.target.value)} className={inputCls} required />
                    {errors.holiday_date && <span className="text-[10px] text-rose-600 font-bold">{errors.holiday_date}</span>}
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Sampai (opsional)</label>
                    <input
                        type="date"
                        value={data.end_date}
                        min={data.holiday_date || undefined}
                        onChange={(e) => setData('end_date', e.target.value)}
                        className={inputCls}
                    />
                    {errors.end_date && <span className="text-[10px] text-rose-600 font-bold">{errors.end_date}</span>}
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Keterangan *</label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="mis. Hari Raya Idul Fitri / Cuti Bersama"
                        className={inputCls}
                        required
                    />
                    {errors.name && <span className="text-[10px] text-rose-600 font-bold">{errors.name}</span>}
                </div>
                <button
                    type="submit"
                    disabled={processing}
                    className="sm:mt-[18px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                    + Tambah Libur
                </button>
            </form>

            {visible.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                    {visible.map((h) => {
                        const past = h.holiday_date < today;
                        return (
                            <div
                                key={h.id}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] ${
                                    past ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-rose-50 border-rose-200 text-rose-800'
                                }`}
                            >
                                <span className="font-bold">{fmt.format(new Date(h.holiday_date + 'T00:00:00'))}</span>
                                <span className="font-medium">{h.name}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(h)}
                                    title="Hapus"
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                    Belum ada hari libur terdaftar.
                </p>
            )}
        </div>
    );
}
