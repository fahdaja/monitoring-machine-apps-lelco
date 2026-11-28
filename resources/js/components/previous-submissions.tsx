import React from 'react';

export interface PreviousQuestion {
    question_text: string;
    answer_text: string;
    answer_note?: string;
    photos: string[];
}

export interface PreviousSubmission {
    label: string;
    form_title: string;
    submitted_at?: string | null;
    submitted_by?: string;
    sections: { section_title: string; questions: PreviousQuestion[] }[];
}

/** Jawaban tahap sebelumnya (Laporan Breakdown / Mulai Repair), read-only. */
export default function PreviousSubmissions({ items }: { items?: PreviousSubmission[] }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <details key={item.label} className="rounded-xl border border-slate-200 bg-slate-50">
                    <summary className="px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer">
                        Data {item.label}
                        <span className="font-normal text-slate-500">
                            {' '}
                            · {item.form_title}
                            {item.submitted_at ? ` · ${item.submitted_at}` : ''}
                        </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                        {item.sections.flatMap((s) => s.questions).map((q, i) => (
                            <div key={i} className="text-[11px]">
                                <div className="font-bold text-slate-600">{q.question_text}</div>
                                <div className="text-slate-800">{q.answer_text}</div>
                                {q.answer_note && <div className="italic text-slate-500">&ldquo;{q.answer_note}&rdquo;</div>}
                                {q.photos.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {q.photos.map((url) => (
                                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                                <img src={url} alt="Foto evidence" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </details>
            ))}
        </div>
    );
}
