import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../layouts/app-layout';
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    ClipboardList,
    FileText,
    StickyNote,
    Wrench,
    X,
} from 'lucide-react';

interface SubmissionQuestion {
    question_text: string;
    input_type: string;
    answer_text: string;
    answer_note: string;
    photos: string[];
    is_abnormal: boolean;
}

interface SubmissionSection {
    section_title: string;
    section_description?: string | null;
    questions: SubmissionQuestion[];
}

interface SubmissionView {
    context: string;
    label: string;
    form_title: string;
    form_code: string;
    submitted_at?: string | null;
    submitted_by: string;
    question_count: number;
    answered_count: number;
    note_count: number;
    photo_count: number;
    abnormal_count: number;
    sections: SubmissionSection[];
}

interface Props {
    ticket: {
        ticket_code: string;
        status: string;
        status_label: string;
        priority: string;
        problem_category: string;
        description?: string | null;
        solution?: string | null;
        root_cause?: string | null;
        corrective_action?: string | null;
        sparepart_needed: boolean;
        vendor_name?: string | null;
        downtime_minutes?: number | null;
        breakdown_minutes?: number | null;
        problems: { question_text?: string; abnormal_options?: string; answer_text?: string }[];
        reported_at?: string | null;
    };
    machine: {
        id: number;
        machine_code: string;
        machine_name: string;
        machine_type: string;
        location: string;
        department: string;
        detail_url: string;
    };
    people: { reporter: string; assignee: string; verifier?: string | null };
    timeline: { label: string; at?: string | null; actor?: string | null }[];
    submissions: SubmissionView[];
}

const STATUS_TONE: Record<string, string> = {
    OPEN: 'bg-rose-100 text-rose-700 border-rose-200',
    ACKNOWLEDGED: 'bg-amber-100 text-amber-700 border-amber-200',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    UNDER_REPAIR: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    WAITING_SPAREPART: 'bg-purple-100 text-purple-700 border-purple-200',
    WAITING_VENDOR: 'bg-purple-100 text-purple-700 border-purple-200',
    READY_FOR_CLOSING: 'bg-sky-100 text-sky-700 border-sky-200',
    CLOSED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const CONTEXT_TONE: Record<string, { badge: string; icon: React.ElementType }> = {
    MANUAL_REPORT: { badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: FileText },
    START_REPAIR: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Wrench },
    CLOSE_TICKET: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-xs font-bold text-slate-800 mt-1 break-words">{value || '-'}</p>
        </div>
    );
}

const TEXT_TONE: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200',
    rose: 'bg-rose-50 border-rose-200',
    indigo: 'bg-indigo-50 border-indigo-200',
    emerald: 'bg-emerald-50 border-emerald-200',
};

function TextBlock({ label, value, tone = 'slate' }: { label: string; value?: string | null; tone?: string }) {
    if (!value) return null;

    return (
        <div className={`rounded-xl border p-3 ${TEXT_TONE[tone] ?? TEXT_TONE.slate}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-xs text-slate-700 mt-1 whitespace-pre-line leading-relaxed">{value}</p>
        </div>
    );
}

export default function BreakdownTicketDetail({ ticket, machine, people, timeline, submissions }: Props) {
    const [zoom, setZoom] = useState<string | null>(null);

    const photoCount = submissions.reduce((total, s) => total + s.photo_count, 0);
    const statusTone = STATUS_TONE[ticket.status] ?? 'bg-slate-100 text-slate-700 border-slate-200';

    return (
        <AppLayout>
            <Head title={`Detail Tiket ${ticket.ticket_code}`} />

            <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-5">
                {/* Header tiket */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/breakdowns"
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-extrabold text-slate-900">{ticket.ticket_code}</h1>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusTone}`}>
                                    {ticket.status_label || ticket.status}
                                </span>
                            </div>
                            <Link href={machine.detail_url} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                                {machine.machine_code} | {machine.machine_name} | 📍 {machine.location}
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <Camera className="w-4 h-4" />
                        {photoCount} foto evidence
                    </div>
                </div>

                {/* Profil tiket */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoCell label="Kategori" value={ticket.problem_category} />
                    <InfoCell label="Prioritas" value={ticket.priority} />
                    <InfoCell label="Dilaporkan" value={ticket.reported_at} />
                    <InfoCell
                        label="Downtime"
                        value={`${ticket.breakdown_minutes ?? ticket.downtime_minutes ?? 0} menit`}
                    />
                    <InfoCell label="Pelapor" value={people.reporter} />
                    <InfoCell label="Teknisi" value={people.assignee} />
                    <InfoCell label="Verifikator" value={people.verifier} />
                    <InfoCell
                        label="Sumber"
                        value={ticket.sparepart_needed ? 'Butuh sparepart / vendor' : 'Internal'}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                    <TextBlock label="Deskripsi Laporan" value={ticket.description} tone="slate" />
                    <TextBlock label="Root Cause" value={ticket.root_cause} tone="rose" />
                    <TextBlock label="Tindakan Perbaikan" value={ticket.corrective_action} tone="indigo" />
                    <TextBlock label="Solusi / Verifikasi" value={ticket.solution} tone="emerald" />
                </div>

                {/* Linimasa */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                        Linimasa Penanganan
                    </h2>
                    <ol className="space-y-2">
                        {timeline.map((step, index) => (
                            <li key={`${step.label}-${index}`} className="flex items-start gap-3">
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                                <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700">{step.label}</span>
                                    <span className="text-[11px] text-slate-500">
                                        {step.at ?? '-'}
                                        {step.actor ? ` • ${step.actor}` : ''}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Submission */}
                {submissions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                        <ClipboardList className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-700">Belum ada submission pada tiket ini</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Jawaban form laporan breakdown, mulai repair, dan tutup tiket akan tampil di sini setelah diisi.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
                            Isi Submission Form
                        </h2>

                        {submissions.map((submission) => {
                            const tone = CONTEXT_TONE[submission.context] ?? { badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: ClipboardList };
                            const Icon = tone.icon;

                            return (
                                <section key={submission.context} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1.5 rounded-lg border ${tone.badge}`}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <div>
                                                <p className="text-xs font-extrabold text-slate-900">{submission.label}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {submission.form_title} • {submission.form_code}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-500 text-right">
                                            <p className="font-bold text-slate-700">{submission.submitted_by}</p>
                                            <p>{submission.submitted_at ?? '-'}</p>
                                        </div>
                                    </div>

                                    <div className="px-4 py-2 flex flex-wrap gap-2 bg-slate-50 border-b border-slate-100">
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                                            Terisi {submission.answered_count}/{submission.question_count} pertanyaan
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                                            {submission.note_count} catatan
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                                            {submission.photo_count} foto
                                        </span>
                                        {submission.abnormal_count > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                                                {submission.abnormal_count} temuan abnormal
                                            </span>
                                        )}
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {submission.sections.map((section, sIndex) => (
                                            <div key={`${submission.context}-s-${sIndex}`} className="p-4">
                                                {submission.sections.length > 1 && (
                                                    <div className="mb-3">
                                                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                                                            {section.section_title}
                                                        </p>
                                                        {section.section_description && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5">{section.section_description}</p>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    {section.questions.map((question, qIndex) => (
                                                        <article
                                                            key={`${submission.context}-q-${sIndex}-${qIndex}`}
                                                            className={`rounded-xl border p-3 ${
                                                                question.is_abnormal ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/60'
                                                            }`}
                                                        >
                                                            <p className="text-xs font-bold text-slate-800">{question.question_text}</p>

                                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                                                                        question.is_abnormal
                                                                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    }`}
                                                                >
                                                                    {question.answer_text}
                                                                </span>
                                                                {question.input_type && (
                                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                                        {question.input_type}
                                                                    </span>
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
                                                                            className="rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-slate-900"
                                                                        >
                                                                            <img src={url} alt="Foto evidence" className="w-20 h-20 object-cover" />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </article>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lightbox foto */}
            {zoom && (
                <div
                    className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4"
                    onClick={() => setZoom(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                        onClick={() => setZoom(null)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img src={zoom} alt="Foto evidence" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                </div>
            )}
        </AppLayout>
    );
}
