import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ZoomOutModal from '@/components/common/ZoomOutModal';
import { formatMinutes } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardList, StickyNote } from 'lucide-react';

interface RecordQuestion {
    question_text: string;
    input_type: string;
    answer_text: string;
    answer_note: string;
    photos: string[];
    is_abnormal: boolean;
}

interface RecordSection {
    section_title: string;
    section_description?: string | null;
    questions: RecordQuestion[];
}

interface Props {
    record: {
        kind: 'INSPECTION' | 'TICKET';
        type_label: string;
        form_title: string;
        form_code: string;
        reference_label: string;
        reference_code: string;
        submitted_by: string;
        submitted_at?: string | null;
        started_at?: string | null;
        fill_minutes?: number | null;
        due_date?: string | null;
        end_date?: string | null;
        is_late: boolean;
        late_days: number;
        origin_type?: string | null;
        source_task_code?: string | null;
        abnormal_count: number;
        ticket?: { ticket_code: string; status: string; detail_url?: string | null } | null;
        show_normality: boolean;
        sections: RecordSection[];
    };
    machine?: { id: number; machine_code: string; machine_name: string; location?: string | null; detail_url: string } | null;
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-xs font-bold text-slate-800 mt-1 break-words">{value || '-'}</p>
        </div>
    );
}

export default function RecordShow({ record, machine }: Props) {
    const [zoom, setZoom] = useState<string | null>(null);
    const [onlyAbnormal, setOnlyAbnormal] = useState(false);

    const allQuestions = record.sections.flatMap((s) => s.questions);
    const answered = allQuestions.filter((q) => q.answer_text !== '-' || q.photos.length > 0).length;

    const goBack = () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = machine?.detail_url ?? '/records';
    };

    return (
        <AppLayout>
            <Head title={`Record ${record.form_title}`} />

            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
                <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </button>

                {/* Header */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{record.type_label}</p>
                                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{record.form_title}</h1>
                                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{record.form_code}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                            </span>
                            {record.is_late && (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                    Terlambat {record.late_days} hari
                                </span>
                            )}
                            {record.show_normality && (
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                        record.abnormal_count > 0
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                >
                                    {record.abnormal_count > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {record.abnormal_count > 0 ? `${record.abnormal_count} temuan NG` : 'Semua OK'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <InfoCell
                            label="Mesin"
                            value={
                                machine ? (
                                    <Link href={machine.detail_url} className="text-blue-600 hover:underline">
                                        {machine.machine_code} — {machine.machine_name}
                                    </Link>
                                ) : '-'
                            }
                        />
                        <InfoCell label={record.reference_label} value={record.reference_code} />
                        <InfoCell label="Diisi oleh" value={record.submitted_by} />
                        <InfoCell label="Waktu submit" value={record.submitted_at} />
                        {record.kind === 'INSPECTION' && (
                            <>
                                <InfoCell label="Jadwal" value={record.due_date} />
                                <InfoCell label="Batas akhir" value={record.end_date} />
                                <InfoCell label="Mulai dikerjakan" value={record.started_at} />
                                <InfoCell
                                    label="Lama pengisian"
                                    value={formatMinutes(record.fill_minutes)}
                                />
                                <InfoCell
                                    label="Asal task"
                                    value={record.origin_type === 'CONDITION' ? `Lanjutan dari ${record.source_task_code ?? '-'}` : 'Jadwal rutin'}
                                />
                            </>
                        )}
                    </div>

                    {record.ticket && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            <span className="text-rose-800">
                                {record.kind === 'INSPECTION' ? 'Temuan abnormal membuat tiket breakdown' : 'Tiket breakdown'}{' '}
                                <strong>{record.ticket.ticket_code}</strong> ({record.ticket.status})
                            </span>
                            {record.ticket.detail_url && (
                                <Link href={record.ticket.detail_url} className="ml-auto font-bold text-rose-700 hover:underline">
                                    Lihat tiket →
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Jawaban */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-700">
                            Jawaban — terisi {answered}/{allQuestions.length} pertanyaan
                        </p>
                        {record.show_normality && record.abnormal_count > 0 && (
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={onlyAbnormal}
                                    onChange={(e) => setOnlyAbnormal(e.target.checked)}
                                    className="rounded border-rose-300 text-rose-600 w-3.5 h-3.5"
                                />
                                Tampilkan temuan NG saja
                            </label>
                        )}
                    </div>

                    <div className="divide-y divide-slate-100">
                        {record.sections.map((section, sIndex) => {
                            const questions = onlyAbnormal ? section.questions.filter((q) => q.is_abnormal) : section.questions;
                            if (questions.length === 0) return null;

                            return (
                                <div key={sIndex} className="p-4 sm:p-5">
                                    <div className="mb-3">
                                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                                            Bagian {sIndex + 1} · {section.section_title}
                                        </p>
                                        {section.section_description && (
                                            <p className="text-[11px] text-slate-500 mt-0.5">{section.section_description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        {questions.map((question, qIndex) => (
                                            <article
                                                key={qIndex}
                                                className={`rounded-xl border p-3 ${
                                                    question.is_abnormal ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50/60'
                                                }`}
                                            >
                                                <p className="text-xs font-bold text-slate-800">{question.question_text}</p>

                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                                                            question.is_abnormal
                                                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                                                : question.answer_text === '-'
                                                                    ? 'bg-white text-slate-400 border-slate-200'
                                                                    : 'bg-white text-slate-700 border-slate-200'
                                                        }`}
                                                    >
                                                        {question.answer_text}
                                                    </span>
                                                    {question.is_abnormal && (
                                                        <span className="text-[10px] font-black text-rose-600 uppercase">NG</span>
                                                    )}
                                                </div>

                                                {question.answer_note && (
                                                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-600">
                                                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                                        <span className="whitespace-pre-line">{question.answer_note}</span>
                                                    </p>
                                                )}

                                                {question.photos.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {question.photos.map((url) => (
                                                            <button
                                                                key={url}
                                                                type="button"
                                                                onClick={() => setZoom(url)}
                                                                className="relative rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-slate-900 cursor-pointer"
                                                            >
                                                                <img src={url} alt="Foto evidence" className="w-20 h-20 object-cover" />
                                                                <Camera className="absolute bottom-1 right-1 w-3.5 h-3.5 text-white drop-shadow" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ZoomOutModal isOpen={!!zoom} onClose={() => setZoom(null)} imageSrc={zoom ?? ''} title="Foto evidence" />
        </AppLayout>
    );
}
