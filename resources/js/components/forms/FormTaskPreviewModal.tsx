import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, UploadCloud, ChevronRight, ChevronLeft } from 'lucide-react';
import FormLayout from '@/layouts/form-layout';

export interface PreviewOption {
    id?: number;
    option_text: string;
    is_normal: boolean;
    goto_form_section_id?: number | null;
}

export interface PreviewQuestion {
    question_text: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    help_text?: string;
    standard_text?: string;
    is_required: boolean;
    validation_rules?: any;
    options?: PreviewOption[];
    previewImages: string[];
}

export interface PreviewSection {
    section_title?: string;
    section_description?: string | null;
    questions: PreviewQuestion[];
}

interface FormTaskPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    formTitle: string;
    formDescription?: string;
    formType?: string;
    sections: PreviewSection[];
}

interface AnswerState {
    value: any;
    note?: string;
    photoUrl?: string;
    fileName?: string;
}

export default function FormTaskPreviewModal({
    isOpen,
    onClose,
    formTitle,
    formDescription,
    formType = 'INSPECTION',
    sections,
}: FormTaskPreviewModalProps) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [history, setHistory] = useState<number[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
    const [errors, setErrors] = useState<Record<string, { value?: string; note?: string; photo?: string }>>({});
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIdx(0);
            setHistory([]);
            setAnswers({});
            setErrors({});
            setZoomSrc(null);
            setSubmitSuccess(false);
            setIsSidebarOpen(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const currentSection = sections[currentIdx];
    const totalSections = sections.length;
    const progressPct = totalSections > 0 ? Math.round(((currentIdx + 1) / totalSections) * 100) : 100;

    const getKey = (sIdx: number, qIdx: number) => `${sIdx}_${qIdx}`;
    const getAns = (sIdx: number, qIdx: number): AnswerState => answers[getKey(sIdx, qIdx)] || { value: '' };

    const validateTextRule = (q: PreviewQuestion, rawVal: string): string | null => {
        const val = rawVal.trim();
        if (!val || !q.validation_rules) return null;
        const rule = Array.isArray(q.validation_rules) ? q.validation_rules[0] || {} : q.validation_rules || {};
        const expected = String(rule.expected_answer || '').trim();
        if (!expected) return null;
        const customMsg = String(rule.validation_error_message || '').trim();
        const lower = expected.toLowerCase();

        let valid = true;
        if (lower === 'angka' || lower === 'number') {
            valid = /^-?\d+([.,]\d+)?$/.test(val);
        } else if (lower === 'huruf' || lower === 'text') {
            valid = /[a-zA-Z]/.test(val) && !/^-?\d+([.,]\d+)?$/.test(val);
        } else {
            valid = val.toLowerCase() === lower;
        }
        return valid ? null : customMsg || `Jawaban tidak sesuai aturan (${expected}).`;
    };

    const isQuestionAbnormal = (q: PreviewQuestion, ans: AnswerState): boolean => {
        if (q.input_type === 'SELECT' || q.input_type === 'DROPDOWN') {
            const opt = q.options?.find((o) => o.option_text === ans.value);
            return !!(opt && opt.is_normal === false);
        }
        if (q.input_type === 'CHECKBOX') {
            const vals = Array.isArray(ans.value) ? ans.value : [];
            return !!q.options?.some((o) => vals.includes(o.option_text) && o.is_normal === false);
        }
        return false;
    };

    const updateAnswer = (sIdx: number, qIdx: number, patch: Partial<AnswerState>, q?: PreviewQuestion) => {
        const key = getKey(sIdx, qIdx);
        setAnswers((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || { value: '' }), ...patch },
        }));

        if (q && patch.value !== undefined && (q.input_type === 'TEXT' || q.input_type === 'TEXTAREA')) {
            const err = validateTextRule(q, String(patch.value || ''));
            setErrors((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), value: err || undefined } }));
        } else if (patch.value !== undefined) {
            setErrors((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), value: undefined } }));
        }
        if (patch.note !== undefined) {
            setErrors((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), note: undefined } }));
        }
        if (patch.photoUrl !== undefined) {
            setErrors((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), photo: undefined } }));
        }
    };

    const validateCurrentSection = (): boolean => {
        if (!currentSection) return true;
        let ok = true;
        const nextErrs: Record<string, { value?: string; note?: string; photo?: string }> = { ...errors };

        currentSection.questions.forEach((q, qIdx) => {
            const key = getKey(currentIdx, qIdx);
            const ans = getAns(currentIdx, qIdx);
            const empty =
                ans.value === undefined ||
                ans.value === null ||
                ans.value === '' ||
                (typeof ans.value === 'string' && ans.value.trim() === '') ||
                (Array.isArray(ans.value) && ans.value.length === 0);

            if (q.is_required && empty) {
                nextErrs[key] = { ...(nextErrs[key] || {}), value: 'Pertanyaan ini wajib diisi' };
                ok = false;
            } else if (!empty && (q.input_type === 'TEXT' || q.input_type === 'TEXTAREA')) {
                const ruleErr = validateTextRule(q, String(ans.value || ''));
                if (ruleErr) {
                    nextErrs[key] = { ...(nextErrs[key] || {}), value: ruleErr };
                    ok = false;
                }
            }

            if (isQuestionAbnormal(q, ans)) {
                if (!ans.note || ans.note.trim() === '') {
                    nextErrs[key] = { ...(nextErrs[key] || {}), note: 'Catatan wajib diisi untuk temuan abnormal.' };
                    ok = false;
                }
                if (!ans.photoUrl) {
                    nextErrs[key] = { ...(nextErrs[key] || {}), photo: 'Foto evidence wajib diisi untuk temuan abnormal.' };
                    ok = false;
                }
            }
        });

        setErrors(nextErrs);
        return ok;
    };

    const handleNext = () => {
        if (!validateCurrentSection()) return;

        let targetIdx = currentIdx + 1;
        currentSection?.questions.forEach((q, qIdx) => {
            if (q.input_type === 'SELECT') {
                const ans = getAns(currentIdx, qIdx);
                const opt = q.options?.find((o) => o.option_text === ans.value);
                if (opt && opt.goto_form_section_id !== null && opt.goto_form_section_id !== undefined) {
                    const jump = Number(opt.goto_form_section_id);
                    if (jump > currentIdx && jump < totalSections) {
                        targetIdx = jump;
                    }
                }
            }
        });

        if (targetIdx < totalSections) {
            setHistory((prev) => [...prev, currentIdx]);
            setCurrentIdx(targetIdx);
        }
    };

    const handlePrev = () => {
        if (history.length > 0) {
            const prevIdx = history[history.length - 1];
            setHistory((prev) => prev.slice(0, -1));
            setCurrentIdx(prevIdx);
        } else if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
        }
    };

    const handleSimulateSubmit = () => {
        if (!validateCurrentSection()) return;
        setSubmitSuccess(true);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
            <FormLayout
                currentSectionIndex={currentIdx}
                totalSections={totalSections}
                progressPercentage={progressPct}
                isFirstSection={currentIdx === 0 && history.length === 0}
                isLastSection={currentIdx >= totalSections - 1}
                handlePrev={handlePrev}
                handleNext={handleNext}
                onSubmitFinal={handleSimulateSubmit}
                titleOverride={`${formTitle || 'Formulir Pemantauan'} (Preview)`}
                onCloseOverride={onClose}
            >
            {/* Tombol Panah Buka/Tutup Sidebar Daftar Bagian */}
            {totalSections > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        title={isSidebarOpen ? 'Tutup Daftar Bagian' : 'Buka Daftar Bagian'}
                        className={`fixed top-1/2 -translate-y-1/2 z-50 w-7 h-14 rounded-r-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg flex items-center justify-center transition-all cursor-pointer ${
                            isSidebarOpen ? 'left-72' : 'left-0'
                        }`}
                    >
                        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    <aside
                        className={`fixed top-16 bottom-16 left-0 z-40 w-72 bg-white border-r border-slate-200 shadow-2xl overflow-y-auto p-4 space-y-2 transition-transform duration-200 ${
                            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    >
                        <div className="px-2 pb-2 border-b border-slate-100">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Daftar Bagian ({totalSections})
                            </p>
                        </div>
                        {sections.map((sec, idx) => {
                            const isActive = idx === currentIdx;
                            const isDone = idx < currentIdx;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        setCurrentIdx(idx);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                                        isActive
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                            : isDone
                                            ? 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span
                                        className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black shrink-0 ${
                                            isActive
                                                ? 'bg-emerald-500 text-white'
                                                : isDone
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {idx + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                            {sec.section_title || `Bagian ${idx + 1}`}
                                        </p>
                                        <p className={`text-[10px] mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {sec.questions.length} pertanyaan
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </aside>
                </>
            )}

            {/* Body: Konten Soal */}
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5">
                <main className="w-full min-w-0">
                    <div className="space-y-5 pb-6">
                        {/* Section Header Card */}
                    {currentSection && (
                        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                Bagian {currentIdx + 1} / {totalSections}
                            </span>
                            <h3 className="text-base sm:text-lg font-extrabold break-words">
                                {currentSection.section_title || formTitle || `Bagian ${currentIdx + 1}`}
                            </h3>
                            {(currentSection.section_description || (currentIdx === 0 && formDescription)) && (
                                <p className="text-xs text-slate-300 leading-relaxed break-words">
                                    {currentSection.section_description || formDescription}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Questions */}
                    {currentSection?.questions.map((q, qIdx) => {
                        const key = getKey(currentIdx, qIdx);
                        const ans = getAns(currentIdx, qIdx);
                        const qErr = errors[key] || {};
                        const abnormal = isQuestionAbnormal(q, ans);

                        const fileRule = Array.isArray(q.validation_rules)
                            ? q.validation_rules[0] || {}
                            : q.validation_rules || {};
                        const allowedTypes = Array.isArray(fileRule.allowed_file_type) && fileRule.allowed_file_type.length > 0
                            ? fileRule.allowed_file_type.join(', ').toUpperCase()
                            : 'JPG, JPEG, PNG, WEBP';
                        const maxFileSize = fileRule.max_file_size || '10MB';

                        return (
                            <div
                                key={qIdx}
                                className={`bg-white rounded-2xl p-4 sm:p-6 border shadow-xs space-y-3.5 transition-all ${
                                    qErr.value || qErr.note || qErr.photo
                                        ? 'border-rose-300 ring-1 ring-rose-200'
                                        : 'border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-2.5">
                                    <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-black shrink-0 mt-0.5">
                                        {qIdx + 1}
                                    </span>
                                    <label className="text-sm font-bold text-slate-900 leading-snug break-words flex-1">
                                        {q.question_text || 'Pertanyaan Tanpa Judul'}
                                        {q.is_required && <span className="text-rose-600 ml-1">*</span>}
                                    </label>
                                </div>

                                {q.help_text && q.help_text.trim() !== '' && (
                                    <div className="text-xs text-sky-900 bg-sky-50 border border-sky-200/80 rounded-xl p-3 leading-relaxed break-words">
                                        <span className="font-bold">Panduan:</span> {q.help_text}
                                    </div>
                                )}

                                {q.standard_text && q.standard_text.trim() !== '' && (
                                    <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 leading-relaxed break-words">
                                        <span className="font-bold">Standar Acuan:</span> {q.standard_text}
                                    </div>
                                )}

                                {/* Multi-image horizontal scroll carousel (identik dengan tasks/show) */}
                                {q.previewImages.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className={q.previewImages.length === 1 ? 'w-full' : 'flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2'}>
                                            {q.previewImages.map((src, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className={`relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden p-1.5 ${
                                                        q.previewImages.length === 1 ? 'w-full' : 'shrink-0 w-[85%] sm:w-[340px] snap-center'
                                                    }`}
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`Gambar ${imgIdx + 1}`}
                                                        className="w-full h-[220px] sm:h-[250px] object-contain rounded-lg cursor-zoom-in"
                                                        onClick={() => setZoomSrc(src)}
                                                    />
                                                    {q.previewImages.length > 1 && (
                                                        <span className="absolute top-3 left-3 text-[10px] font-bold text-white bg-slate-900/75 px-2 py-0.5 rounded-md">
                                                            {imgIdx + 1} / {q.previewImages.length}
                                                        </span>
                                                    )}
                                                    <span className="absolute top-3 right-3 text-[9px] font-bold text-white bg-slate-900/70 px-1.5 py-0.5 rounded">
                                                        Klik untuk zoom
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {q.previewImages.length > 1 && (
                                            <p className="text-[10px] text-slate-400 font-medium text-right">
                                                Geser ke kiri / kanan untuk melihat {q.previewImages.length} gambar →
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Input Widget */}
                                <div className="pt-1">
                                    {q.input_type === 'TEXT' && (
                                        <input
                                            type="text"
                                            value={String(ans.value || '')}
                                            onChange={(e) => updateAnswer(currentIdx, qIdx, { value: e.target.value }, q)}
                                            placeholder="Tulis jawaban singkat..."
                                            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 outline-none"
                                        />
                                    )}

                                    {q.input_type === 'TEXTAREA' && (
                                        <textarea
                                            rows={3}
                                            value={String(ans.value || '')}
                                            onChange={(e) => updateAnswer(currentIdx, qIdx, { value: e.target.value }, q)}
                                            placeholder="Tulis jawaban panjang..."
                                            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 outline-none resize-y"
                                        />
                                    )}

                                    {q.input_type === 'SELECT' && (
                                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                                            {(q.options || []).map((opt, oIdx) => {
                                                const selected = ans.value === opt.option_text;
                                                return (
                                                    <button
                                                        key={oIdx}
                                                        type="button"
                                                        onClick={() => updateAnswer(currentIdx, qIdx, { value: opt.option_text }, q)}
                                                        className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                                                            selected
                                                                ? opt.is_normal
                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                                                    : 'bg-rose-600 text-white border-rose-600 shadow-md'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                                        }`}
                                                    >
                                                        {opt.option_text}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.input_type === 'DROPDOWN' && (
                                        <select
                                            value={String(ans.value || '')}
                                            onChange={(e) => updateAnswer(currentIdx, qIdx, { value: e.target.value }, q)}
                                            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium outline-none"
                                        >
                                            <option value="">-- Pilih Opsi --</option>
                                            {(q.options || []).map((opt, oIdx) => (
                                                <option key={oIdx} value={opt.option_text}>
                                                    {opt.option_text}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {q.input_type === 'CHECKBOX' && (
                                        <div className="space-y-2">
                                            {(q.options || []).map((opt, oIdx) => {
                                                const vals = Array.isArray(ans.value) ? ans.value : [];
                                                const checked = vals.includes(opt.option_text);
                                                return (
                                                    <label
                                                        key={oIdx}
                                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                                                            checked ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:bg-white'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={(e) => {
                                                                const next = e.target.checked
                                                                    ? [...vals, opt.option_text]
                                                                    : vals.filter((v: string) => v !== opt.option_text);
                                                                updateAnswer(currentIdx, qIdx, { value: next }, q);
                                                            }}
                                                            className="w-5 h-5 text-blue-600 rounded border-slate-300 shrink-0"
                                                        />
                                                        <span className="text-sm font-semibold text-slate-800 break-words">{opt.option_text}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.input_type === 'FILE' && (
                                        <label className="flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl cursor-pointer transition-all">
                                            <UploadCloud className="w-6 h-6 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-700">
                                                {ans.fileName ? `Terpilih: ${ans.fileName}` : 'Klik untuk simulasi upload file'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                Format: {allowedTypes} • Maks. {maxFileSize}
                                            </span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) updateAnswer(currentIdx, qIdx, { value: f.name, fileName: f.name }, q);
                                                }}
                                            />
                                        </label>
                                    )}

                                    {q.input_type === 'DATE' && (
                                        <input
                                            type="date"
                                            value={String(ans.value || '')}
                                            onChange={(e) => updateAnswer(currentIdx, qIdx, { value: e.target.value }, q)}
                                            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                                        />
                                    )}

                                    {q.input_type === 'TIME' && (
                                        <input
                                            type="time"
                                            value={String(ans.value || '')}
                                            onChange={(e) => updateAnswer(currentIdx, qIdx, { value: e.target.value }, q)}
                                            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none"
                                        />
                                    )}
                                </div>

                                {qErr.value && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{qErr.value}</span>
                                    </div>
                                )}

                                {/* Panel Temuan Abnormal (identik dengan tasks/show) */}
                                {abnormal && (
                                    <div className="mt-2 p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
                                        <p className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" /> Temuan Abnormal — Catatan & Foto Evidence Wajib Diisi
                                        </p>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Catatan Temuan <span className="text-rose-600">*</span>
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={ans.note || ''}
                                                onChange={(e) => updateAnswer(currentIdx, qIdx, { note: e.target.value })}
                                                placeholder="Jelaskan kondisi abnormal yang ditemukan..."
                                                className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-400"
                                            />
                                            {qErr.note && <p className="text-[11px] text-rose-600 font-semibold mt-1">{qErr.note}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Foto Evidence <span className="text-rose-600">*</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer">
                                                <UploadCloud className="w-4 h-4" />
                                                {ans.photoUrl ? 'Ganti Foto Evidence' : 'Pilih Foto Evidence'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) updateAnswer(currentIdx, qIdx, { photoUrl: URL.createObjectURL(f) });
                                                    }}
                                                />
                                            </label>
                                            {ans.photoUrl && (
                                                <img src={ans.photoUrl} alt="Evidence" className="mt-2 h-24 rounded-xl border border-rose-200 object-cover" />
                                            )}
                                            {qErr.photo && <p className="text-[11px] text-rose-600 font-semibold mt-1">{qErr.photo}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                </main>
            </div>
            </FormLayout>

            {/* Modal Simulasi Submit Berhasil */}
            {submitSuccess && (
                <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-slate-900">Simulasi Submit Berhasil!</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Semua validasi wajib, aturan angka/huruf, dan bukti abnormal sudah lolos. Data tidak disimpan ke database karena ini mode preview.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSubmitSuccess(false);
                                    setCurrentIdx(0);
                                    setHistory([]);
                                    setAnswers({});
                                    setErrors({});
                                }}
                                className="py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Ulangi Preview
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                            >
                                Tutup Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Zoom Gambar */}
            {zoomSrc && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomSrc(null)}
                >
                    <img src={zoomSrc} alt="Zoom" className="max-w-full max-h-[90dvh] object-contain rounded-xl" />
                </div>
            )}
        </div>
    );
}
