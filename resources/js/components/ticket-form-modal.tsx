import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DynamicFormModal from './dynamic-form-modal';
import PreviousSubmissions, { type PreviousSubmission } from './previous-submissions';
import type { FormAnswerInput, FormPayload } from './dynamic-form-modal';

export type TicketFormContext = 'START_REPAIR' | 'CLOSE_TICKET';

interface TicketFormMeta {
    ticket_code: string;
    context: TicketFormContext;
    context_label?: string;
    machine_name?: string;
    machine_code?: string;
    status?: string;
    submitted_at?: string | null;
}

interface TicketFormModalProps {
    ticketCode: string;
    context: TicketFormContext;
    onClose: () => void;
}

const CONFIG: Record<TicketFormContext, { heading: string; submitLabel: string; tone: 'indigo' | 'slate' }> = {
    START_REPAIR: {
        heading: 'Form Mulai Repair',
        submitLabel: 'Simpan & Mulai Repair',
        tone: 'indigo',
    },
    CLOSE_TICKET: {
        heading: 'Form Selesaikan & Close Ticket',
        submitLabel: 'Simpan & Siap Diverifikasi',
        tone: 'slate',
    },
};

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col">
                {children}
            </div>
        </div>
    );
}

/**
 * Modal form repair / closing pada board breakdown.
 * Pertanyaan diambil dari template form transisi tiket (section di-flatten),
 * jawaban tersimpan ke ticket_submissions lewat POST /breakdowns/{ticket}/submissions.
 */
export default function TicketFormModal({ ticketCode, context, onClose }: TicketFormModalProps) {
    const [form, setForm] = useState<FormPayload | null>(null);
    const [meta, setMeta] = useState<TicketFormMeta | null>(null);
    const [initialAnswers, setInitialAnswers] = useState<Record<string, FormAnswerInput>>({});
    const [previous, setPrevious] = useState<PreviousSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setError(null);

        axios
            .get(`/breakdowns/${ticketCode}/form/${context}/data`)
            .then(({ data }) => {
                if (cancelled) return;

                setForm(data.form);
                setMeta(data.meta);
                setInitialAnswers(data.initial_answers ?? {});
                setPrevious(data.previous_submissions ?? []);
            })
            .catch((axiosError: any) => {
                if (cancelled) return;

                setError(
                    axiosError?.response?.data?.message
                        || 'Form belum bisa dibuka. Pastikan template form-nya sudah dibuat di menu Manajemen Form.',
                );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [ticketCode, context]);

    const config = CONFIG[context];

    if (loading) {
        return (
            <Shell>
                <div className="px-6 py-12 text-center">
                    <div className="mx-auto mb-3 w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                    <p className="text-xs font-bold text-slate-500">Memuat pertanyaan form...</p>
                </div>
            </Shell>
        );
    }

    if (error || !form) {
        return (
            <Shell>
                <div className="px-6 py-8 space-y-4">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-xs font-bold text-rose-700">{error ?? 'Form tidak tersedia.'}</p>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Shell>
        );
    }

    const banner = meta && (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="font-mono font-bold text-slate-700">{meta.ticket_code}</span>
                <span>{meta.machine_code} &bull; {meta.machine_name}</span>
                <span className="font-bold text-slate-600">{meta.status}</span>
                {meta.submitted_at && <span className="text-emerald-700">tersimpan: {meta.submitted_at}</span>}
            </div>
            <PreviousSubmissions items={previous} />
        </div>
    );

    return (
        <DynamicFormModal
            form={form}
            heading={form.form_title || config.heading}
            subheading={meta ? `${meta.context_label ?? config.heading} • ${meta.ticket_code}` : config.heading}
            banner={banner}
            action={`/breakdowns/${ticketCode}/submissions`}
            extraData={{ context }}
            submitLabel={config.submitLabel}
            tone={config.tone}
            initialAnswers={initialAnswers}
            onClose={onClose}
        />
    );
}
