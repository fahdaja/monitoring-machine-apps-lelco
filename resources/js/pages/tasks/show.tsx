import FormLayout from "@/layouts/form-layout";
import ZoomOutModal from "@/components/common/ZoomOutModal";
import { InspectionsFormProps, InspectionTask } from "@/types/inspection";
import { useInspectionForm } from "@/hooks/use-inspection-form";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";

type AnswerDetail = {
    value: any;
    note?: string;
    photos?: string;
};

type AnswersMap = Record<number, AnswerDetail>;

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

export default function InspectionForm({ tasks }: InspectionsFormProps) {
    const pageProps = usePage().props as unknown as {
        task?: InspectionTask;
        tasks?: InspectionTask[];
        initialAnswers?: Record<number, any>;
    };

    const currentTask: InspectionTask | undefined =
        pageProps.task || (tasks && tasks.length > 0 ? tasks[0] : undefined);

    const sections = currentTask?.form?.sections || [];

    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [zoomedImgSrc, setZoomedImgSrc] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [progressOpen, setProgressOpen] = useState(false);
    
    // State untuk melacak section yang dilewati (Skipped)
    const [skippedSectionIds, setSkippedSectionIds] = useState<string[]>([]);

    // State autosave
    const [autoSaveStatus, setAutoSaveStatus] = useState<SaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [savedQuestionIds, setSavedQuestionIds] = useState<Set<number>>(new Set());
    const [showSavedToast, setShowSavedToast] = useState(false);
    const firstSaveRef = useRef(true);

    const {
        currentSectionIndex,
        setCurrentSectionIndex,
        questionErrors,
        maxCompletedIndex,
        currentSection,
        completedCount,
        getAnswer,
        handleValueChoice,
        handleNoteChange,
        handleFileUpload,
        handleAddPhoto,
        handleRemoveEvidencePhoto,
        handleRemoveFile,
        progressPercentage,
        isFirstSection,
        isLastSection,
        setQuestionError,
        handlePrev,
        handleNext,
        answers,
    } = useInspectionForm(sections, pageProps.initialAnswers || {}, 0, currentTask?.id);

    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ====== UTILS: Bersihkan data sebelum dikirim ======
    const cleanAnswersPayload = (currentAnswers: AnswersMap) => {
        const payload: AnswersMap = {};
        
        Object.entries(currentAnswers).forEach(([id, detail]) => {
            if (!detail) return;
            
            const val = detail.value;
            const note = detail.note || '';
            const photo = detail.photos || '';

            const hasVal = 
                (val !== undefined && val !== null && val !== '') && 
                !(Array.isArray(val) && val.length === 0) &&
                !(typeof val === 'string' && val.trim() === '');

            const hasNote = String(note).trim() !== '';
            const hasPhoto = String(photo).trim() !== '';

            if (hasVal || hasNote || hasPhoto) {
                payload[Number(id)] = {
                    value: val,
                    note: note,
                    photos: photo
                };
            }
        });

        return payload;
    };

    const hasActualAnswers = (currentAnswers: AnswersMap) => {
        return Object.keys(cleanAnswersPayload(currentAnswers)).length > 0;
    };

    // ====== AUTOSAVE ======
    const triggerAutoSave = (currentAnswers: AnswersMap, immediate = false) => {
        const taskId = currentTask?.id;
        if (!currentTask || !taskId) return;
        
        const cleaned = cleanAnswersPayload(currentAnswers);

        if (Object.keys(cleaned).length === 0) {
            setAutoSaveStatus('idle');
            return;
        }

        setAutoSaveStatus('saving');

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        const doSave = async () => {
            try {
                await axios.post(`/inspection-form/${taskId}/draft`, { answers: cleaned });
                setAutoSaveStatus('saved');
                setLastSavedAt(new Date());

                const answeredIds = new Set<number>(Object.keys(cleaned).map(Number));
                setSavedQuestionIds(answeredIds);

                if (firstSaveRef.current) {
                    firstSaveRef.current = false;
                    setShowSavedToast(true);
                    setTimeout(() => setShowSavedToast(false), 2500);
                }
            } catch (error) {
                console.error("Gagal auto-save draft:", error);
                setAutoSaveStatus('error');
            } finally {
                autoSaveTimerRef.current = null;
            }
        };

        if (immediate) {
            doSave();
        } else {
            autoSaveTimerRef.current = setTimeout(doSave, 1500);
        }
    };

    // ✅ EFEK UNTUK MELACAK SECTION YANG DILEWATI (SINKRON KE UI)
    useEffect(() => {
        const newSkippedIds: string[] = [];

        sections.forEach((sec, sIndex) => {
            sec.questions?.forEach((q: any) => {
                const ans = answers[q.id];
                if (ans && ans.value) {
                    const selectedOpt = q.options?.find((o: any) => 
                        String(o.id) === String(ans.value) || 
                        String(o.option_text).toLowerCase() === String(ans.value).toLowerCase()
                    );
                    
                    if (selectedOpt && selectedOpt.goto_form_section_id) {
                        const targetIdx = sections.findIndex((s: any) => String(s.id) === String(selectedOpt.goto_form_section_id));
                        
                        if (targetIdx !== -1 && targetIdx > sIndex) {
                            for (let i = sIndex + 1; i < targetIdx; i++) {
                                newSkippedIds.push(String(sections[i].id));
                            }
                        }
                    }
                }
            });
        });

        setSkippedSectionIds(newSkippedIds);
    }, [answers, sections]);

    // ✅ KUNCI AUTOSAVE
    const isInitialMount = useRef(true);
    const prevAnswersRef = useRef<string>('');

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            prevAnswersRef.current = JSON.stringify(answers);
            return;
        }

        if (!currentTask?.id) return;

        const currentAnswersStr = JSON.stringify(answers);
        if (currentAnswersStr === prevAnswersRef.current) return;

        if (!hasActualAnswers(answers)) {
            prevAnswersRef.current = currentAnswersStr;
            return;
        }

        prevAnswersRef.current = currentAnswersStr;
        triggerAutoSave(answers);

    }, [answers, currentTask]);

    useEffect(() => {
        const isMobileNow = window.innerWidth < 1024;
        if (progressOpen && isMobileNow) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [progressOpen]);

    // ====== SUBMIT FINAL ======
    const handleSubmitFinal = () => {
        const taskId = currentTask?.id;
        if (!currentTask || !taskId) return;

        let hasClientError = false;
        const clientErrors: Record<number, Record<string, string>> = {};
        let firstErrorSectionIndex = -1;

        const isOptionNormalFalse = (opt: any) => {
            if (opt.is_normal === undefined || opt.is_normal === null) return false;
            const val = String(opt.is_normal).toLowerCase();
            return opt.is_normal === false || opt.is_normal === 0 || val === '0' || val === 'false';
        };
        const normalizeText = (text: any) => String(text || '').trim().toLowerCase();

        sections.forEach((sec, sIndex) => {
            let sectionHasError = false;
            
            // Cek apakah section ini masuk dalam daftar skipped
            const isSkipped = skippedSectionIds.includes(String(sec.id));
            
            sec.questions?.forEach((q: any) => {
                const ans = getAnswer(q.id);
                let isAbnormal = false;

                if (q.input_type === 'SELECT') {
                    const selectedOpt = q.options?.find((o: any) => String(o.id) === String(ans.value));
                    isAbnormal = !!(selectedOpt && isOptionNormalFalse(selectedOpt));
                } else if (q.input_type === 'DROPDOWN') {
                    const selectedOpt = q.options?.find((o: any) => 
                        normalizeText(o.option_text) === normalizeText(ans.value)
                    );
                    isAbnormal = !!(selectedOpt && isOptionNormalFalse(selectedOpt));
                } else if (q.input_type === 'CHECKBOX') {
                    const currentVals = Array.isArray(ans.value) ? ans.value : [];
                    isAbnormal = !!q.options?.some((o: any) =>
                        currentVals.some((v: any) => normalizeText(v) === normalizeText(o.option_text)) && 
                        isOptionNormalFalse(o)
                    );
                }

                const isValueEmpty =
                    ans.value === undefined ||
                    ans.value === null ||
                    ans.value === '' ||
                    (typeof ans.value === 'string' && ans.value.trim() === '') ||
                    (Array.isArray(ans.value) && ans.value.length === 0);

                // Abaikan Validasi Required jika section di-skip
                if (!isSkipped && q.is_required && isValueEmpty) {
                    clientErrors[q.id] = { ...(clientErrors[q.id] || {}), value: 'Pertanyaan ini wajib diisi' };
                    hasClientError = true;
                    sectionHasError = true;
                }

                // Abaikan Validasi Abnormal jika section di-skip
                if (isAbnormal && !isSkipped) {
                    if (!ans.note || ans.note.trim() === '') {
                        clientErrors[q.id] = { ...(clientErrors[q.id] || {}), note: 'Catatan wajib diisi untuk temuan abnormal.' };
                        hasClientError = true;
                        sectionHasError = true;
                    }
                    
                    const isPhotoEmpty =
                        !ans.photos || ans.photos === '' ||
                        (typeof ans.photos === 'string' && ans.photos.trim() === '') ||
                        (Array.isArray(ans.photos) && ans.photos.length === 0);
                    
                    if (isPhotoEmpty) {
                        clientErrors[q.id] = { ...(clientErrors[q.id] || {}), photos: 'Foto evidence wajib diisi untuk temuan abnormal.' };
                        hasClientError = true;
                        sectionHasError = true;
                    }
                }
            });

            if (sectionHasError && firstErrorSectionIndex === -1) {
                firstErrorSectionIndex = sIndex;
            }
        });

        if (hasClientError) {
            Object.keys(clientErrors).forEach((qId) => {
                const id = Number(qId);
                if (clientErrors[id].value) setQuestionError(id, 'value', clientErrors[id].value);
                if (clientErrors[id].note) setQuestionError(id, 'note', clientErrors[id].note);
                if (clientErrors[id].photos) setQuestionError(id, 'photos', clientErrors[id].photos);
            });

            if (firstErrorSectionIndex !== -1) {
                setCurrentSectionIndex(firstErrorSectionIndex);
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
            }
            return;
        }

        setIsSubmitting(true);
        const finalPayload = cleanAnswersPayload(answers);

        router.post(`/inspection-form/${taskId}/submit`, { answers: finalPayload }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                localStorage.removeItem(`inspection_section_${taskId}`);
                localStorage.removeItem(`inspection_answers_${window.location.pathname}`);
            },
            onError: (errors: Record<string, string>) => {
                console.error("Gagal submit dari backend:", errors);
                Object.keys(errors).forEach((key) => {
                    const match = key.match(/answers\.(\d+)\.(value|note|photos)/);
                    if (match) {
                        const questionId = Number(match[1]);
                        const field = match[2] as 'value' | 'note' | 'photos';
                        let message = errors[key];
                        if (field === 'photos') message = 'Foto evidence wajib diisi untuk temuan abnormal';
                        else if (field === 'note') message = 'Catatan wajib diisi untuk temuan abnormal';
                        else if (field === 'value') message = 'Pertanyaan ini wajib diisi';
                        setQuestionError(questionId, field, message);
                    }
                });
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    // ====== RENDER SIDEBAR SECTION ======
    const renderSectionItem = (sec: any, index: number) => {
        const isActive = currentSectionIndex === index;
        const isSkipped = skippedSectionIds.includes(String(sec.id));
        const isDone = index < currentSectionIndex;
        const isLocked = !isActive && !isDone && !isSkipped && index > currentSectionIndex  && index > maxCompletedIndex;
        
        // Section yang di-skip tidak bisa diklik
        const isUnlocked = !isLocked && !isSkipped;

        return (
            <div
                key={sec.id || index}
                onClick={() => {
                    if (isUnlocked) {
                        setCurrentSectionIndex(index);
                        setProgressOpen(false);
                    }
                }}
                className={`
                    group relative flex items-start gap-3 rounded-xl p-3 transition-all
                    ${isSkipped
                        ? 'bg-slate-100/50 border-2 border-dashed border-slate-300 opacity-60 cursor-not-allowed select-none'
                        : !isUnlocked
                            ? 'opacity-60 cursor-not-allowed select-none'
                            : isActive
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-sm cursor-pointer ring-1 ring-blue-200/50'
                                : isDone
                                    ? 'bg-emerald-50/50 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                                    : 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                    }
                `}
            >
                {isActive && (
                    <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider text-white bg-blue-600 px-1.5 py-0.5 rounded-full shadow-sm">
                        Aktif
                    </span>
                )}

                <div
                    className={`
                        shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm
                        ${isSkipped
                            ? 'bg-slate-200 text-slate-400'
                            : isDone
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                : isActive
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-300 ring-offset-1'
                                    : isLocked
                                        ? 'bg-slate-200 text-slate-400'
                                        : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'
                        }
                    `}
                >
                    {isSkipped ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                    ) : isDone ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : isLocked ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    ) : (
                        <span>{index + 1}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider truncate ${
                                isSkipped ? 'text-slate-400' : isDone ? 'text-emerald-600' : isActive ? 'text-blue-600' : isLocked ? 'text-slate-400' : 'text-slate-500'
                            }`}
                        >
                            {sec.section_code}
                        </span>
                        {isSkipped && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-200 px-1 py-0.5 rounded shrink-0">
                                Dilewati
                            </span>
                        )}
                        {isDone && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded shrink-0">
                                Selesai
                            </span>
                        )}
                    </div>

                    <p
                        className={`text-xs font-semibold leading-tight truncate ${
                            isSkipped ? 'text-slate-400 line-through' : isDone ? 'text-emerald-900' : isActive ? 'text-blue-900' : isLocked ? 'text-slate-400' : 'text-slate-800'
                        }`}
                        title={sec.section_title}
                    >
                        {sec.section_title}
                    </p>

                    <p
                        className={`text-[10px] font-medium mt-1 ${
                            isSkipped ? 'text-slate-400' : isDone ? 'text-emerald-600' : isActive ? 'text-blue-600' : isLocked ? 'text-slate-400' : 'text-slate-400'
                        }`}
                    >
                        {isSkipped ? 'Dilewati karena alur' : isDone ? 'Sudah dikerjakan' : isActive ? 'Sedang dikerjakan' : isLocked ? 'Terkunci' : 'Belum dimulai'}
                    </p>
                </div>
            </div>
        );
    };

    const formatTime = (d: Date | null) => {
        if (!d) return '';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const savedInCurrentSection = (currentSection?.questions || []).filter(
        (q: any) => savedQuestionIds.has(q.id)
    ).length;
    const totalInCurrentSection = currentSection?.questions?.length || 0;

    return (
        <FormLayout
            currentSectionIndex={currentSectionIndex}
            totalSections={sections.length}
            progressPercentage={progressPercentage}
            isFirstSection={isFirstSection}
            isLastSection={isLastSection}
            handlePrev={handlePrev}
            handleNext={handleNext}
            onSubmitFinal={handleSubmitFinal}
            isSubmitting={isSubmitting}
        >
            {showSavedToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300 w-[calc(100%-2rem)] max-w-xs sm:w-auto sm:max-w-none">
                    <div className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg flex items-center justify-center gap-2 text-[11px] sm:text-xs font-bold whitespace-nowrap">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Draft berhasil disimpan otomatis</span>
                    </div>
                </div>
            )}

            {progressOpen && (
                <div
                    onClick={() => setProgressOpen(false)}
                    className="fixed inset-0 top-16 bg-slate-900/40 z-40"
                    aria-hidden="true"
                />
            )}

            <button
                type="button"
                onClick={() => setProgressOpen(!progressOpen)}
                className={`
                    fixed top-1/2 -translate-y-1/2 z-50 flex items-center justify-center
                    w-8 h-16 rounded-r-xl bg-slate-900 text-white shadow-lg
                    hover:bg-slate-800 active:scale-95 transition-all duration-200 cursor-pointer
                    ${progressOpen ? 'left-80 max-lg:left-72' : 'left-0'}
                `}
                aria-label={progressOpen ? 'Tutup daftar section' : 'Buka daftar section'}
            >
                <svg
                    className={`w-5 h-5 transition-transform duration-200 ${progressOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            <aside
                className={`
                    fixed top-16 bottom-0 left-0 z-40 w-80 max-lg:w-72
                    bg-slate-50 flex flex-col
                    transition-transform duration-200 ease-out
                    ${progressOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="relative bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 text-white px-4 py-4 shrink-0 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400" />

                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <h2 className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                    Progress Inspection
                                </h2>
                            </div>
                            <p className="text-sm font-bold text-white mt-1">
                                Section {currentSectionIndex + 1} <span className="text-slate-400 text-xs font-medium">dari {sections.length}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setProgressOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
                            aria-label="Tutup"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-300">Kemajuan</span>
                            <span className="text-emerald-300 text-sm">{progressPercentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/50"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3">
                        <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-base font-black text-emerald-400 leading-none">
                                {completedCount}
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                Selesai
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-base font-black text-blue-400 leading-none">
                                1
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                Aktif
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-base font-black text-slate-400 leading-none">
                                {Math.max(0, sections.length - completedCount - 1)}
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                Tersisa
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {sections.map((sec, index) => renderSectionItem(sec, index))}
                </div>

                <div className="px-3 py-2.5 border-t border-slate-200 bg-white shrink-0">
                    <p className="text-[9px] text-slate-400 text-center leading-relaxed">
                        💡 Klik section yang terbuka untuk berpindah.
                        <br />
                        Section berikutnya terbuka setelah Anda menyelesaikan yang aktif.
                    </p>
                </div>
            </aside>

            <main
                className={`
                    bg-slate-50 flex-1 min-w-0 rounded-xl overflow-hidden flex flex-col
                    m-3 sm:m-4 lg:m-6 transition-[margin] duration-200 ease-out
                    ${progressOpen ? 'lg:ml-[calc(20rem+1.5rem)]' : ''}
                `}
            >
                <div className="relative bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 text-white px-3 sm:px-6 py-3 sm:py-5 rounded-t-xl shadow-md overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400" />
                    <div className="relative flex flex-col gap-1.5 sm:gap-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 px-2 sm:px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Section {currentSectionIndex + 1} / {sections.length}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-300 font-mono truncate">
                                {currentSection?.section_code}
                            </span>
                        </div>
                        <h1 className="text-base sm:text-lg lg:text-xl font-extrabold leading-snug tracking-tight break-words">
                            {currentSection?.section_title}
                        </h1>
                        {currentSection?.section_description && (
                            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed break-words">
                                {currentSection.section_description}
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                                {autoSaveStatus === 'saving' && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/30 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
                                        <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Menyimpan...
                                    </span>
                                )}
                                {autoSaveStatus === 'saved' && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-200 bg-emerald-500/15 border border-emerald-400/30 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="truncate">
                                            Draft tersimpan
                                            {lastSavedAt && <span className="opacity-70 hidden sm:inline"> · {formatTime(lastSavedAt)}</span>}
                                        </span>
                                    </span>
                                )}
                                {autoSaveStatus === 'error' && (
                                    <button
                                        type="button"
                                        onClick={() => triggerAutoSave(answers, true)}
                                        className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-rose-200 bg-rose-500/15 border border-rose-400/30 px-2 sm:px-2.5 py-1 rounded-full hover:bg-rose-500/25 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Gagal · Coba lagi
                                    </button>
                                )}
                                {autoSaveStatus === 'idle' && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate-300/70 whitespace-nowrap">
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Autosave aktif
                                    </span>
                                )}
                                {totalInCurrentSection > 0 && (
                                    <span className="text-[10px] font-semibold text-slate-300/70 whitespace-nowrap">
                                        {savedInCurrentSection}/{totalInCurrentSection} terjawab
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
                    {currentSection?.questions && currentSection.questions.length > 0 ? (
                        currentSection.questions.map((question: any, qIndex: number) => {
                            const ans = getAnswer(question.id);

                            let isAbnormalCard = false;
                            if (question.input_type === 'SELECT') {
                                const selectedOpt = question.options?.find((o: any) => String(o.id) === String(ans.value));
                                isAbnormalCard = !!(selectedOpt && selectedOpt.is_normal === false);
                            } else if (question.input_type === 'DROPDOWN') {
                                const selectedOpt = question.options?.find((o: any) => o.option_text === ans.value);
                                isAbnormalCard = !!(selectedOpt && selectedOpt.is_normal === false);
                            } else if (question.input_type === 'CHECKBOX') {
                                const currentVals = Array.isArray(ans.value) ? ans.value : [];
                                isAbnormalCard = !!question.options?.some(
                                    (o: any) => currentVals.includes(o.option_text) && o.is_normal === false
                                );
                            }

                            const hasValueError = !!questionErrors[question.id]?.value;
                            const isSaved = savedQuestionIds.has(question.id);

                            const hasAnyAnswer =
                                (ans.value !== undefined && ans.value !== null && ans.value !== '') ||
                                (Array.isArray(ans.value) && ans.value.length > 0) ||
                                (ans.note && ans.note.trim() !== '') ||
                                !!ans.photos;

                            return (
                                <div
                                    key={question.id}
                                    className={`
                                        relative bg-white rounded-2xl border shadow-sm overflow-hidden
                                        transition-all duration-200
                                        ${isAbnormalCard
                                            ? 'border-rose-300 ring-1 ring-rose-200/50'
                                            : hasValueError
                                                ? 'border-rose-300 ring-1 ring-rose-200/50'
                                                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <div
                                        className={`absolute top-0 left-0 bottom-0 w-1 ${
                                            isAbnormalCard || hasValueError
                                                ? 'bg-gradient-to-b from-rose-500 to-rose-400'
                                                : isSaved
                                                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-400'
                                                    : 'bg-gradient-to-b from-blue-500 to-emerald-500'
                                        }`}
                                    />

                                    <div className="pl-4 sm:pl-5 pr-3 sm:pr-5 py-4 sm:py-5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`
                                                    shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl
                                                    flex items-center justify-center
                                                    font-black text-sm sm:text-base shadow-sm
                                                    ${isAbnormalCard
                                                        ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/20'
                                                        : isSaved
                                                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20'
                                                            : 'bg-gradient-to-br from-slate-900 to-slate-700 text-white'
                                                    }
                                                `}
                                            >
                                                {qIndex + 1}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        Pertanyaan
                                                    </span>
                                                    {question.is_required && (
                                                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                            Wajib
                                                        </span>
                                                    )}
                                                    {isAbnormalCard && (
                                                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                            ⚠ Abnormal
                                                        </span>
                                                    )}
                                                    {isSaved && hasAnyAnswer && autoSaveStatus === 'saved' && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Draft
                                                        </span>
                                                    )}
                                                </div>
                                                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug break-words">
                                                    {question.question_text}
                                                </h2>
                                            </div>
                                        </div>

                                        {question.help_text && (
                                            <div className="flex items-start gap-2 text-xs text-sky-800 bg-sky-50 border border-sky-200/70 px-3 py-2 rounded-xl">
                                                <svg className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="min-w-0 break-words">
                                                    <strong className="font-bold">Metode:</strong> {question.help_text}
                                                </div>
                                            </div>
                                        )}

                                        {question.standard_text && (
                                            <div className="flex items-start gap-2.5 text-xs text-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/70 px-3 py-2.5 rounded-xl">
                                                <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                <div className="min-w-0 break-words">
                                                    <span className="block font-bold uppercase tracking-wider text-[10px] text-emerald-700 mb-0.5">
                                                        Standar Pemeriksaan
                                                    </span>
                                                    {question.standard_text}
                                                </div>
                                            </div>
                                        )}

                                        {question.question_image && (
                                            <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden p-1.5">
                                                <img
                                                    src={`/storage/${question.question_image}`}
                                                    alt={question.question_text}
                                                    className="w-full max-h-[280px] object-contain rounded-lg cursor-zoom-in"
                                                    onClick={() => {
                                                        setZoomedImgSrc(`/storage/${question.question_image}`);
                                                        setIsImageZoomed(true);
                                                    }}
                                                />
                                                <span className="absolute top-3 right-3 text-[9px] font-bold text-white bg-slate-900/70 backdrop-blur px-1.5 py-0.5 rounded">
                                                    Klik untuk zoom
                                                </span>
                                            </div>
                                        )}

                                        <div className="pt-1">
                                            {(() => {
                                                switch (question.input_type) {
                                                    case 'TEXT':
                                                        return (
                                                            <input
                                                                type="text"
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                placeholder="Tulis jawaban singkat..."
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 transition-all"
                                                            />
                                                        );
                                                    case 'TEXTAREA':
                                                        return (
                                                            <textarea
                                                                rows={3}
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                placeholder="Tulis jawaban panjang..."
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 transition-all resize-y"
                                                            />
                                                        );
                                                    case 'SELECT':
                                                        return (
                                                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2.5">
                                                                {question.options && question.options.length > 0 ? (
                                                                    question.options.map((opt: any) => {
                                                                        const currentAnswer = getAnswer(question.id);
                                                                        
                                                                        // Bandingkan sebagai string
                                                                        const isSelected = String(currentAnswer.value) === String(opt.id);
                                                                        
                                                                        return (
                                                                            <button
                                                                                key={opt.id}
                                                                                type="button"
                                                                                // ✅ Paksa simpan sebagai String agar konsisten
                                                                                onClick={() => handleValueChoice(question.id, String(opt.id), opt)}
                                                                                className={`
                                                                                    w-full sm:flex-1 sm:min-w-[140px] px-4 py-3.5 rounded-xl font-bold text-sm
                                                                                    flex items-center justify-center gap-2 border-2
                                                                                    transition-all active:scale-[0.98] cursor-pointer
                                                                                    ${isSelected
                                                                                        ? !opt.is_normal
                                                                                            ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/30'
                                                                                            : 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                                                                    }
                                                                                `}
                                                                            >
                                                                                {isSelected && (
                                                                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                )}
                                                                                <span className="truncate">{opt.option_text}</span>
                                                                            </button>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleValueChoice(question.id, 'OK')}
                                                                            className={`w-full sm:flex-1 px-4 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98] ${
                                                                                ans.value === 'OK'
                                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30'
                                                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            ✓ OK (Good)
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleValueChoice(question.id, 'NG')}
                                                                            className={`w-full sm:flex-1 px-4 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98] ${
                                                                                ans.value === 'NG'
                                                                                    ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/30'
                                                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-rose-400 hover:bg-rose-50'
                                                                            }`}
                                                                        >
                                                                            ✕ NG (Not Good)
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'DROPDOWN':
                                                        return (
                                                            <select
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 font-medium transition-all"
                                                            >
                                                                <option value="">-- Pilih Opsi --</option>
                                                                {question.options?.map((opt: any) => (
                                                                    <option key={opt.id} value={opt.option_text}>
                                                                        {opt.option_text}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        );
                                                    case 'CHECKBOX':
                                                        return (
                                                            <div className="space-y-2">
                                                                {question.options?.map((opt: any) => {
                                                                    const currentVals = Array.isArray(ans.value) ? ans.value : [];
                                                                    const isChecked = currentVals.includes(opt.option_text);
                                                                    return (
                                                                        <label
                                                                            key={opt.id}
                                                                            className={`
                                                                                flex items-center gap-3 p-3 sm:p-3.5 rounded-xl cursor-pointer border-2 transition-all
                                                                                ${isChecked
                                                                                    ? 'bg-blue-50 border-blue-400'
                                                                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                                                                                }
                                                                            `}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    let updated = [...currentVals];
                                                                                    if (e.target.checked) updated.push(opt.option_text);
                                                                                    else updated = updated.filter(v => v !== opt.option_text);
                                                                                    handleValueChoice(question.id, updated);
                                                                                }}
                                                                                className="w-5 h-5 text-blue-600 rounded border-slate-300 shrink-0"
                                                                            />
                                                                            <span className="text-sm font-semibold text-slate-800 break-words">
                                                                                {opt.option_text}
                                                                            </span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    case 'FILE':
                                                        let fileRules: any = {};
                                                        if (question.validation_rules) {
                                                            try {
                                                                let parsed = typeof question.validation_rules === 'string'
                                                                    ? JSON.parse(question.validation_rules)
                                                                    : question.validation_rules;
                                                                fileRules = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
                                                            } catch (e) {
                                                                console.error("Gagal parsing rules file", e);
                                                            }
                                                        }
                                                        const allowedTypes = fileRules.allowed_file_type
                                                            ? (Array.isArray(fileRules.allowed_file_type)
                                                                ? fileRules.allowed_file_type.join(', ').toUpperCase()
                                                                : fileRules.allowed_file_type)
                                                            : 'JPG, JPEG, PNG';
                                                        const maxFileSize = fileRules.max_file_size || '10MB';
                                                        const fileValue = ans.value;
                                                        const fileName =
                                                            typeof fileValue === 'string'
                                                                ? fileValue.split('/').pop()
                                                                : fileValue instanceof File
                                                                    ? fileValue.name
                                                                    : '';
                                                        return (
                                                            <div className="space-y-3">
                                                                <label className="flex flex-col items-center justify-center gap-2 p-4 sm:p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl cursor-pointer transition-all group">
                                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                                                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                        </svg>
                                                                    </div>
                                                                    <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-blue-700">
                                                                        Klik untuk pilih berkas
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        onChange={(e) => handleFileUpload(question.id, e, question)}
                                                                    />
                                                                </label>
                                                                <p className="text-[10px] sm:text-[11px] text-slate-500 text-center">
                                                                    Tipe: <span className="font-semibold text-slate-700">{allowedTypes}</span>
                                                                    {maxFileSize && <> · Maks: <span className="font-semibold text-slate-700">{maxFileSize}</span></>}
                                                                </p>
                                                                {fileValue && (
                                                                    <div className="text-xs text-slate-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center gap-2">
                                                                        <span className="truncate flex items-center gap-2 min-w-0">
                                                                            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            <span className="truncate font-semibold">{fileName}</span>
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveFile(question.id)}
                                                                            className="text-rose-600 font-bold hover:underline cursor-pointer shrink-0"
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'DATE':
                                                        return (
                                                            <input
                                                                type="date"
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            />
                                                        );
                                                    case 'TIME':
                                                        return (
                                                            <input
                                                                type="time"
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            />
                                                        );
                                                    default:
                                                        return (
                                                            <input
                                                                type="text"
                                                                value={String(ans.value || '')}
                                                                onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                            />
                                                        );
                                                }
                                            })()}
                                        </div>

                                        {questionErrors[question.id]?.value && (
                                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span className="break-words">{questionErrors[question.id].value}</span>
                                            </div>
                                        )}

                                        {(() => {
                                            let isAbnormal = false;
                                            if (question.input_type === 'SELECT') {
                                                const selectedOpt = question.options?.find((o: any) => String(o.id) === String(ans.value));
                                                isAbnormal = !!(selectedOpt && selectedOpt.is_normal === false);
                                            } else if (question.input_type === 'DROPDOWN') {
                                                const selectedOpt = question.options?.find((o: any) => o.option_text === ans.value);
                                                isAbnormal = !!(selectedOpt && selectedOpt.is_normal === false);
                                            } else if (question.input_type === 'CHECKBOX') {
                                                const currentVals = Array.isArray(ans.value) ? ans.value : [];
                                                isAbnormal = question.options?.some(
                                                    (o: any) => currentVals.includes(o.option_text) && o.is_normal === false
                                                );
                                            }
                                            if (!isAbnormal) return null;

                                            return (
                                                <div className="relative bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 rounded-2xl p-3 sm:p-5 space-y-4 shadow-sm overflow-hidden">
                                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-xs sm:text-sm font-extrabold text-rose-800 uppercase tracking-wider">
                                                                Temuan Abnormal
                                                            </h3>
                                                            <p className="text-[10px] sm:text-[11px] text-rose-600 font-medium">
                                                                Wajib isi catatan & foto evidence
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                            Catatan Kerusakan <span className="text-rose-600">*</span>
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={ans.note || ''}
                                                            onChange={(e) => handleNoteChange(question.id, e.target.value)}
                                                            placeholder="Jelaskan detail kerusakan yang ditemukan..."
                                                            className="w-full px-3 py-2.5 text-sm bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-y"
                                                        />
                                                        {questionErrors[question.id]?.note && (
                                                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                <span className="break-words">{questionErrors[question.id].note}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center gap-2 flex-wrap">
                                                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                                Foto Evidence <span className="text-rose-600">*</span>
                                                            </label>
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                JPG, PNG · Maks 2MB
                                                            </span>
                                                        </div>
                                                        <label className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-2 border-dashed border-rose-300 hover:border-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition-all">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="text-[11px] sm:text-xs font-bold text-rose-700">Ambil / Pilih Foto</span>
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/jpg"
                                                                className="hidden"
                                                                onChange={(e) => handleAddPhoto(question.id, e)}
                                                            />
                                                        </label>
                                                        {questionErrors[question.id]?.photos && (
                                                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
                                                                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                <span className="break-words">{questionErrors[question.id].photos}</span>
                                                            </div>
                                                        )}
                                                        {ans.photos && typeof ans.photos === 'string' && (
                                                            <div className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-rose-200 bg-white shadow-sm mt-1">
                                                                <img src={`/storage/${ans.photos}`} alt="Evidence" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveEvidencePhoto(question.id)}
                                                                    className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs shadow-md cursor-pointer transition-colors"
                                                                    aria-label="Hapus foto"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
                            <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">Tidak ada pertanyaan</p>
                            <p className="text-xs text-slate-400 mt-1">Section ini belum memiliki pertanyaan.</p>
                        </div>
                    )}
                </div>
            </main>

            <ZoomOutModal
                isOpen={isImageZoomed}
                onClose={() => setIsImageZoomed(false)}
                imageSrc={zoomedImgSrc}
                altText="Zoom Preview"
                title="Preview Gambar"
            />
        </FormLayout>
    );
}