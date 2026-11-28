import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';

interface FormOpt {
    id: number;
    form_title: string;
    form_code: string;
}

interface MachineLite {
    id: number;
    machine_code: string;
    machine_name: string;
}

type PatternType = 'MANUAL_REPORT' | 'START_REPAIR' | 'CLOSE_TICKET';
type PatternValue = Record<PatternType, number | null>;

const COLUMNS: { type: PatternType; label: string }[] = [
    { type: 'MANUAL_REPORT', label: 'Form Laporan Breakdown' },
    { type: 'START_REPAIR', label: 'Form Mulai Repair' },
    { type: 'CLOSE_TICKET', label: 'Form Tutup Tiket' },
];

const EMPTY: PatternValue = { MANUAL_REPORT: null, START_REPAIR: null, CLOSE_TICKET: null };

interface Props {
    machines: MachineLite[];
    patternForms: Record<PatternType, FormOpt[]>;
    patterns: Record<string, PatternValue>;
}

/**
 * Pola form per mesin: Laporan Breakdown -> Mulai Repair -> Tutup Tiket.
 * Tiap mesin memilih template form untuk masing-masing kategori.
 */
export default function PatternPanel({ machines, patternForms, patterns }: Props) {
    const [search, setSearch] = useState('');
    const [drafts, setDrafts] = useState<Record<number, PatternValue>>({});
    const [savingId, setSavingId] = useState<number | null>(null);

    const valueOf = (m: MachineLite): PatternValue => drafts[m.id] ?? patterns[String(m.id)] ?? EMPTY;

    const setField = (m: MachineLite, type: PatternType, raw: string) => {
        setDrafts((d) => ({ ...d, [m.id]: { ...valueOf(m), [type]: raw ? Number(raw) : null } }));
    };

    const save = (m: MachineLite) => {
        setSavingId(m.id);
        router.put(`/schedules/patterns/${m.id}`, valueOf(m) as any, {
            preserveScroll: true,
            onSuccess: () =>
                setDrafts((d) => {
                    const { [m.id]: _omit, ...rest } = d;
                    return rest;
                }),
            onFinish: () => setSavingId(null),
        });
    };

    const q = search.trim().toLowerCase();
    const visible = machines.filter(
        (m) => !q || m.machine_name.toLowerCase().includes(q) || m.machine_code.toLowerCase().includes(q),
    );

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-extrabold text-slate-900">Pola Form per Mesin</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Tentukan template form untuk tiap tahap tiket breakdown. Form Mulai Repair dan Tutup Tiket
                        otomatis mengikuti pola mesin dan wajib diisi berurutan.
                    </p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari mesin..."
                        className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-slate-900 w-full sm:w-56"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-left">
                        <tr>
                            <th className="px-4 py-2.5 font-bold">Mesin</th>
                            {COLUMNS.map((c) => (
                                <th key={c.type} className="px-3 py-2.5 font-bold">
                                    {c.label}
                                </th>
                            ))}
                            <th className="px-3 py-2.5 font-bold text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visible.map((m) => {
                            const val = valueOf(m);
                            const incomplete = COLUMNS.some((c) => !val[c.type]);
                            const dirty = !!drafts[m.id];
                            return (
                                <tr key={m.id} className="align-top">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900">{m.machine_name}</div>
                                        <div className="text-[11px] text-slate-500">{m.machine_code}</div>
                                        {incomplete && (
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                                Belum lengkap
                                            </span>
                                        )}
                                    </td>
                                    {COLUMNS.map((c) => (
                                        <td key={c.type} className="px-3 py-3">
                                            <select
                                                value={val[c.type] ?? ''}
                                                onChange={(e) => setField(m, c.type, e.target.value)}
                                                className="w-full min-w-[170px] px-2 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-slate-900"
                                            >
                                                <option value="">— Pilih form —</option>
                                                {(patternForms[c.type] ?? []).map((f) => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.form_title} ({f.form_code})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    ))}
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => save(m)}
                                            disabled={!dirty || savingId === m.id}
                                            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-40 cursor-pointer"
                                        >
                                            {savingId === m.id ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    Mesin tidak ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
