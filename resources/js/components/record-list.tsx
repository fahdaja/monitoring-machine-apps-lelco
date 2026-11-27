import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, ClipboardList } from 'lucide-react';

export interface RecordRow {
    key: string;
    kind: 'INSPECTION' | 'TICKET';
    type_label: string;
    form_title: string;
    form_code: string;
    reference_code: string;
    machine?: { id: number; machine_code: string; machine_name: string; location?: string | null } | null;
    submitted_by: string;
    submitted_at?: string | null;
    is_late: boolean;
    late_days: number;
    abnormal_count: number;
    detail_url: string;
}

/** Daftar record — dipakai juga di halaman profil mesin. */
export function RecordList({ rows, emptyText, hideMachine = false }: { rows: RecordRow[]; emptyText: string; hideMachine?: boolean }) {
    if (rows.length === 0) {
        return (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
            {rows.map((row) => (
                <div key={row.key} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                row.kind === 'INSPECTION' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                            }`}
                        >
                            <ClipboardList className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.type_label}</span>
                                <span className="text-[10px] font-mono text-slate-400">· {row.reference_code}</span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-900 truncate">{row.form_title}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                {!hideMachine && row.machine && (
                                    <span>
                                        Mesin: <strong className="text-slate-700">{row.machine.machine_code}</strong>
                                    </span>
                                )}
                                <span>
                                    Oleh: <strong className="text-slate-700">{row.submitted_by}</strong>
                                </span>
                                <span>
                                    Submit: <strong className="text-slate-700">{row.submitted_at ?? '-'}</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 sm:justify-end">
                        {row.kind === 'INSPECTION' &&
                            (row.abnormal_count > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                    <AlertTriangle className="w-3 h-3" /> {row.abnormal_count} NG
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                    OK
                                </span>
                            ))}
                        {row.is_late && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                Telat {row.late_days}h
                            </span>
                        )}
                        <Link
                            href={row.detail_url}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800"
                        >
                            Detail <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}
