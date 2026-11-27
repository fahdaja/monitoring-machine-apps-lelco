import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Filter, RotateCcw } from 'lucide-react';
import { RecordList, type RecordRow } from '@/components/record-list';


interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    records: Paginated<RecordRow>;
    filters: { machine_id?: number | null; form_id?: number | null; date_from?: string | null; date_to?: string | null; kind?: string | null };
    machines: { id: number; machine_code: string; machine_name: string }[];
    forms: { id: number; form_code: string; form_title: string; type_label: string }[];
}

export default function RecordIndex({ records, filters, machines, forms }: Props) {
    const [form, setForm] = useState({
        machine_id: filters.machine_id ? String(filters.machine_id) : '',
        form_id: filters.form_id ? String(filters.form_id) : '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        kind: filters.kind ?? '',
    });

    const apply = (next = form) => {
        const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== null));
        router.get('/records', query, { preserveState: true, preserveScroll: true });
    };

    const reset = () => {
        const empty = { machine_id: '', form_id: '', date_from: '', date_to: '', kind: '' };
        setForm(empty);
        apply(empty);
    };

    const inputCls =
        'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400';

    return (
        <AppLayout>
            <Head title="Record Pengisian Form" />

            <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Record Pengisian Form</h1>
                    <p className="text-xs text-slate-500">
                        Riwayat seluruh form yang sudah selesai diisi: inspeksi, laporan breakdown, form repair, dan form closing.
                    </p>
                </div>

                {/* Filter */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        <select className={inputCls} value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
                            <option value="">Semua mesin</option>
                            {machines.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.machine_code} — {m.machine_name}
                                </option>
                            ))}
                        </select>
                        <select className={inputCls} value={form.form_id} onChange={(e) => setForm({ ...form, form_id: e.target.value })}>
                            <option value="">Semua form</option>
                            {forms.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.form_title} ({f.type_label})
                                </option>
                            ))}
                        </select>
                        <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                            <option value="">Semua jenis</option>
                            <option value="INSPECTION">Inspeksi</option>
                            <option value="TICKET">Form tiket breakdown</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                            <input type="date" className={inputCls} value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
                            <span className="text-slate-400 text-xs">–</span>
                            <input type="date" className={inputCls} value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => apply()}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <Filter className="w-3.5 h-3.5" /> Terapkan
                            </button>
                            <button
                                type="button"
                                onClick={reset}
                                title="Reset filter"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <RecordList rows={records.data} emptyText="Belum ada record yang sesuai filter." />

                {records.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {records.links.map((link, i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={!link.url}
                                onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                className={`min-w-8 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                                    link.active
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 disabled:opacity-40'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
                <p className="text-center text-[11px] text-slate-400">Total {records.total} record</p>
            </div>
        </AppLayout>
    );
}

