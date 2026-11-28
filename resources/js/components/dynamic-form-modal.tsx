import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import PhotoField from '@/components/photo-field';
import { encodePhotos, parsePhotos } from '@/lib/photos';

export interface FormOption {
    id: number;
    option_text: string;
    is_normal: boolean;
}

export interface FormQuestion {
    id: number;
    question_text: string;
    question_image_url?: string | null;
    help_text?: string | null;
    standard_text?: string | null;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    is_required: boolean;
    options: FormOption[];
}

export interface FormPayload {
    id: number;
    form_code: string;
    form_title?: string;
    form_description?: string;
    questions: FormQuestion[];
}

export interface FormAnswerInput {
    value?: string | string[];
    note?: string;
    photos?: string;
}

interface DynamicFormModalProps {
    form: FormPayload;
    heading?: string;
    subheading?: string;
    banner?: React.ReactNode;
    action: string;
    extraData?: Record<string, string | number | boolean>;
    submitLabel?: string;
    tone?: 'rose' | 'indigo' | 'slate';
    initialAnswers?: Record<string, FormAnswerInput>;
    onClose: () => void;
    onSuccess?: () => void;
}

interface AnswerState {
    value: string | string[];
    note: string;
    photos: string;
}

const BODY_ID = 'dynamic-form-modal-body';

const TONES: Record<string, string> = {
    rose: 'bg-rose-600 hover:bg-rose-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    slate: 'bg-slate-900 hover:bg-slate-800',
};

const emptyAnswer = (): AnswerState => ({ value: '', note: '', photos: '' });

const hasValue = (value: string | string[]): boolean => {
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim() !== '';
};

// Field teks (deskripsi/help/standard) hanya ditampilkan bila berisi teks berarti;
// nilai kosong atau placeholder strip (mis. "-") dianggap tidak terpakai.
const hasMeaningfulText = (value?: string | null): boolean => {
    const text = String(value ?? '').trim();
    return text !== '' && !['-', '--', '–', '—', '.', '·'].includes(text);
};

const selectedOptions = (question: FormQuestion, value: string | string[]): FormOption[] => {
    const raw = Array.isArray(value) ? value : [value];

    return question.options.filter((opt) =>
        raw.some((v) => String(v) === String(opt.id) || String(v) === String(opt.option_text)),
    );
};

const normalizeInitial = (initial?: Record<string, FormAnswerInput>): Record<number, AnswerState> => {
    if (!initial) return {};

    return Object.entries(initial).reduce<Record<number, AnswerState>>((carry, [questionId, answer]) => {
        carry[Number(questionId)] = {
            value: answer?.value ?? '',
            note: String(answer?.note ?? ''),
            photos: String(answer?.photos ?? ''),
        };

        return carry;
    }, {});
};

/**
 * Modal berisi daftar pertanyaan form yang ditampilkan datar (tanpa navigasi section).
 * Keluarga TICKETING (laporan breakdown, form repair, form closing tiket):
 * murni data entry - tidak ada konsep normal/abnormal maupun catatan/foto evidence.
 */
export default function DynamicFormModal({
    form,
    heading,
    subheading,
    banner,
    action,
    extraData = {},
    submitLabel = 'Kirim',
    tone = 'rose',
    initialAnswers,
    onClose,
    onSuccess,
}: DynamicFormModalProps) {
    const [answers, setAnswers] = useState<Record<number, AnswerState>>(() => normalizeInitial(initialAnswers));
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    const getAnswer = (questionId: number): AnswerState => answers[questionId] ?? emptyAnswer();

    const patchAnswer = (questionId: number, patch: Partial<AnswerState>) => {
        setAnswers((prev) => ({ ...prev, [questionId]: { ...emptyAnswer(), ...prev[questionId], ...patch } }));
        setFieldErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((key) => delete next[`answers.${questionId}.${key}`]);
            return next;
        });
    };

    const pickOption = (question: FormQuestion, option: FormOption) => {
        if (question.input_type === 'CHECKBOX') {
            const current = Array.isArray(getAnswer(question.id).value)
                ? (getAnswer(question.id).value as string[])
                : [];
            const marker = String(option.id);
            const next = current.includes(marker)
                ? current.filter((v) => v !== marker)
                : [...current, marker];

            patchAnswer(question.id, { value: next });
            return;
        }

        patchAnswer(question.id, { value: String(option.id) });
    };

    const uploadPhoto = async (questionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'evidence-photos');

        setUploadingId(questionId);

        try {
            const { data } = await axios.post('/inspection-form/upload-temp', formData);

            if (data?.success && data?.path) {
                patchAnswer(questionId, { photos: data.path });
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Foto gagal diunggah.';
            setFieldErrors((prev) => ({ ...prev, [`answers.${questionId}.photos`]: message }));
        } finally {
            setUploadingId(null);
        }
    };

    const removePhoto = async (questionId: number, path: string) => {
        try {
            await axios.post('/inspection-form/remove-file', { path });
        } catch {
            // file mungkin sudah terhapus, state tetap dibersihkan
        }

        patchAnswer(questionId, { photos: '' });
    };

    // Upload berkas untuk pertanyaan bertipe FILE (disimpan sebagai value path).
    const uploadQuestionFile = async (questionId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('question_id', String(questionId));
        formData.append('folder', 'question-files');

        setUploadingId(questionId);

        try {
            const { data } = await axios.post('/inspection-form/upload-temp', formData);

            if (data?.success && data?.path) {
                // Multi-foto: value disimpan sebagai JSON array path
                setAnswers((prev) => {
                    const cur = prev[questionId] ?? emptyAnswer();
                    return {
                        ...prev,
                        [questionId]: { ...cur, value: encodePhotos([...parsePhotos(cur.value), data.path]) },
                    };
                });
                setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next[`answers.${questionId}.value`];
                    return next;
                });
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Berkas gagal diunggah.';
            setFieldErrors((prev) => ({ ...prev, [`answers.${questionId}.value`]: message }));
        } finally {
            setUploadingId(null);
        }
    };

    const removeQuestionPhoto = async (questionId: number, path: string) => {
        try {
            await axios.post('/inspection-form/remove-file', { path });
        } catch {
            // file mungkin sudah terhapus, state tetap dibersihkan
        }

        setAnswers((prev) => {
            const cur = prev[questionId] ?? emptyAnswer();
            return {
                ...prev,
                [questionId]: { ...cur, value: encodePhotos(parsePhotos(cur.value).filter((p) => p !== path)) },
            };
        });
    };

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        form.questions.forEach((question) => {
            const answer = getAnswer(question.id);

            // Ticketing = data entry murni: hanya wajib-isi. Tidak ada syarat
            // catatan/foto (konsep normal/abnormal tidak berlaku di keluarga ini).
            if (question.is_required && !hasValue(answer.value)) {
                next[`answers.${question.id}.value`] = 'Pertanyaan ini wajib diisi.';
            }
        });

        setFieldErrors(next);

        if (Object.keys(next).length > 0) {
            document.getElementById(BODY_ID)?.scrollTo({ top: 0, behavior: 'smooth' });
        }

        return Object.keys(next).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);

        const payload: Record<number, { value: string | string[]; note: string; photos: string }> = {};

        form.questions.forEach((question) => {
            const answer = getAnswer(question.id);

            if (!hasValue(answer.value) && !answer.note.trim() && !answer.photos.trim()) return;

            payload[question.id] = {
                value: answer.value,
                note: answer.note.trim(),
                photos: answer.photos.trim(),
            };
        });

        router.post(
            action,
            { ...extraData, answers: payload },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setAnswers({});
                    setFieldErrors({});
                    onSuccess?.();
                    onClose();
                },
                onError: (errors) => setFieldErrors(errors as Record<string, string>),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-2xl max-h-[92dvh] sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 sm:px-6 py-3.5 shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                            {heading || form.form_title || 'Isi Form'}
                        </h3>
                        {subheading && (
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{subheading}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg font-bold flex items-center justify-center cursor-pointer disabled:opacity-40"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    {/* Body pertanyaan */}
                    <div id={BODY_ID} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                        {banner}

                        {hasMeaningfulText(form.form_description) && (
                            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                {form.form_description}
                            </p>
                        )}

                        {form.questions.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">
                                Form ini belum punya pertanyaan. Susun dulu di menu Manajemen Form.
                            </p>
                        )}

                        {form.questions.map((question, index) => {
                            const answer = getAnswer(question.id);
                            const selected = selectedOptions(question, answer.value);
                            const errorValue = fieldErrors[`answers.${question.id}.value`];

                            return (
                                <div key={question.id} className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-white">
                                    <div className="flex items-start gap-2">
                                        <span className="text-[10px] font-black text-slate-400 mt-0.5 shrink-0">{index + 1}.</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800">
                                                {question.question_text}
                                                {question.is_required && <span className="text-rose-500"> *</span>}
                                            </p>
                                            {hasMeaningfulText(question.help_text) && (
                                                <p className="text-[10px] text-slate-400 mt-0.5">{question.help_text}</p>
                                            )}
                                            {hasMeaningfulText(question.standard_text) && (
                                                <p className="text-[10px] text-emerald-700 mt-0.5">Standar: {question.standard_text}</p>
                                            )}
                                        </div>
                                    </div>

                                    {question.question_image_url && (
                                        <img
                                            src={question.question_image_url}
                                            alt=""
                                            className="max-h-32 rounded-lg border border-slate-200 object-cover"
                                        />
                                    )}

                                    {/* Input sesuai tipe */}
                                    {/* Pilihan hanya untuk tipe pilihan; opsi sisa saat admin mengganti tipe diabaikan */}
                                    {question.options.length > 0 && (question.input_type === 'SELECT' || question.input_type === 'CHECKBOX') ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {question.options.map((opt) => {
                                                const isActive = selected.some((s) => s.id === opt.id);

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => pickOption(question, opt)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                                            isActive
                                                                ? 'bg-slate-900 text-white border-slate-900'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {opt.option_text}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : question.options.length > 0 && question.input_type === 'DROPDOWN' ? (
                                        <select
                                            value={Array.isArray(answer.value) ? answer.value[0] ?? '' : answer.value}
                                            onChange={(e) => patchAnswer(question.id, { value: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 bg-white"
                                        >
                                            <option value="">Pilih...</option>
                                            {question.options.map((opt) => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.option_text}
                                                </option>
                                            ))}
                                        </select>
                                    ) : question.input_type === 'TEXTAREA' ? (
                                        <textarea
                                            rows={3}
                                            value={String(answer.value)}
                                            onChange={(e) => patchAnswer(question.id, { value: e.target.value })}
                                            placeholder="Tulis penjelasannya..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900"
                                        />
                                    ) : question.input_type === 'FILE' ? (
                                        <PhotoField
                                            paths={parsePhotos(answer.value)}
                                            uploading={uploadingId === question.id}
                                            onAdd={(file) => uploadQuestionFile(question.id, file)}
                                            onRemove={(path) => removeQuestionPhoto(question.id, path)}
                                        />
                                    ) : (
                                        <input
                                            type={
                                                question.input_type === 'DATE'
                                                    ? 'date'
                                                    : question.input_type === 'TIME'
                                                        ? 'time'
                                                        : 'text'
                                            }
                                            value={String(answer.value)}
                                            onChange={(e) => patchAnswer(question.id, { value: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900"
                                        />
                                    )}

                                    {errorValue && <p className="text-[10px] text-rose-600 font-semibold">{errorValue}</p>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || form.questions.length === 0}
                            className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${TONES[tone] ?? TONES.rose}`}
                        >
                            {submitting ? 'Menyimpan...' : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
