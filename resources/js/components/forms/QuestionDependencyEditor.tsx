import { CHOICE_TYPES } from '@/lib/question-visibility';

/**
 * Pengaturan dependensi pertanyaan di form builder:
 * "Tampilkan pertanyaan ini hanya jika pertanyaan [pemicu] dijawab [opsi A / opsi B ...]".
 *
 * Disimpan di validation_rules[0]:
 *  - show_on_abnormal      : true = pertanyaan ini bergantung (nama lama dipertahankan agar form lama tetap jalan)
 *  - trigger_question_code : question_code pemicu, atau "order:N" untuk pertanyaan yang belum tersimpan
 *  - trigger_option_texts  : teks opsi pemicu yang memunculkan pertanyaan ini (kosong = opsi NG apa pun)
 */
interface Props {
    questions: any[]; // seluruh pertanyaan dalam section yang sama
    qIndex: number;
    rule: any; // validation_rules[0]
    onChange: (rule: any) => void;
}

const isTruthy = (v: any) => v === true || v === 1 || String(v).toLowerCase() === 'true' || String(v) === '1';
const keyOf = (q: any, i: number) => q.question_code || `order:${i + 1}`;
const norm = (t: any) => String(t ?? '').trim().toLowerCase();

export default function QuestionDependencyEditor({ questions, qIndex, rule, onChange }: Props) {
    const candidates = questions
        .slice(0, qIndex)
        .map((q, i) => ({ q, i, key: keyOf(q, i) }))
        .filter(({ q }) => CHOICE_TYPES.includes(String(q.input_type).toUpperCase()));

    // Fitur hanya tersedia jika ada pertanyaan PILIHAN di atasnya (bukan isian)
    if (qIndex === 0 || candidates.length === 0) return null;

    const r = rule || {};
    const enabled = isTruthy(r.show_on_abnormal);
    const nearest = candidates[candidates.length - 1];
    const selected = candidates.find((c) => c.key === r.trigger_question_code) ?? (r.trigger_question_code ? null : nearest);
    const wanted: string[] = Array.isArray(r.trigger_option_texts) ? r.trigger_option_texts : [];
    const options: any[] = (selected?.q.options || []).filter((o: any) => String(o.option_text ?? '').trim() !== '');

    const toggleOption = (text: string) => {
        const has = wanted.some((t) => norm(t) === norm(text));
        onChange({
            ...r,
            trigger_option_texts: has ? wanted.filter((t) => norm(t) !== norm(text)) : [...wanted, text],
        });
    };

    return (
        <div className={`w-full rounded-xl border p-2.5 space-y-2 ${enabled ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
            <label className="flex items-center gap-1.5 font-semibold text-indigo-800 cursor-pointer text-xs">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                        onChange({
                            ...r,
                            show_on_abnormal: e.target.checked,
                            // Pemicu dibuat eksplisit saat diaktifkan supaya pilihan opsinya jelas
                            trigger_question_code: e.target.checked ? r.trigger_question_code || nearest.key : r.trigger_question_code,
                        })
                    }
                    className="rounded border-indigo-300 text-indigo-600 w-3.5 h-3.5"
                />
                Tampilkan hanya jika pertanyaan sebelumnya dijawab tertentu
            </label>

            {enabled && (
                <div className="space-y-2 pl-5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-semibold text-slate-600">Jika pertanyaan</span>
                        <select
                            value={selected?.key ?? ''}
                            onChange={(e) => onChange({ ...r, trigger_question_code: e.target.value, trigger_option_texts: [] })}
                            className="rounded-lg border border-indigo-200 bg-white px-2 py-1 font-semibold text-indigo-800 max-w-[260px] truncate focus:outline-none focus:border-indigo-400"
                        >
                            {!selected && <option value="">— pemicu tidak ditemukan, pilih ulang —</option>}
                            {candidates.map((c) => (
                                <option key={c.key} value={c.key}>
                                    #{c.i + 1} {c.q.question_text || 'Pertanyaan'}
                                </option>
                            ))}
                        </select>
                        <span className="font-semibold text-slate-600">dijawab:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {options.map((o: any, oi: number) => {
                            const active = wanted.some((t) => norm(t) === norm(o.option_text));
                            return (
                                <button
                                    key={`${o.option_text}-${oi}`}
                                    type="button"
                                    onClick={() => toggleOption(String(o.option_text))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                        active
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {active ? '✓ ' : ''}
                                    {o.option_text}
                                </button>
                            );
                        })}
                        {options.length === 0 && <span className="text-[11px] text-slate-400 italic">Pertanyaan pemicu belum punya opsi.</span>}
                    </div>

                    <p className="text-[10px] text-slate-500">
                        {wanted.length > 0
                            ? `Pertanyaan ini muncul jika jawabannya: ${wanted.join(' atau ')}.`
                            : 'Belum memilih jawaban — sementara pertanyaan ini muncul jika jawabannya opsi Abnormal (NG).'}{' '}
                        Jika teks opsi pemicu diubah, pilih ulang di sini.
                    </p>
                </div>
            )}
        </div>
    );
}
