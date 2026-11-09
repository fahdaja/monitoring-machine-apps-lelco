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

export default function InspectionForm({ tasks }: InspectionsFormProps) {
    const pageProps = usePage().props as unknown as { task?: InspectionTask; tasks?: InspectionTask[]; initialAnswers?: Record<number, any>; };

    // Ambil task aktif
    const currentTask: InspectionTask | undefined = pageProps.task || (tasks && tasks.length > 0 ? tasks[0] : undefined);

    // Ambil list sections secara dinamis dari database
    const sections = currentTask?.form?.sections || [];

    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const [zoomedImgSrc, setZoomedImgSrc] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving...' | 'error'>('saved');
    // Panggil custom hook
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

    // Auto-save menggunakan Axios POST (hanya untuk MENYIMPAN, bukan mengambil)
    const triggerAutoSave = (currentAnswers: AnswersMap) => {
        const taskId = currentTask?.id;
        if (!currentTask || !taskId) return;

        setAutoSaveStatus('saving...');

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                await axios.post(
                    `/inspection-form/${taskId}/draft`,
                    {
                        answers: currentAnswers,
                    }
                );
                setAutoSaveStatus('saved');
            } catch (error) {
                console.error("Gagal auto-save draft:", error);
                setAutoSaveStatus('error');
            } finally {
                autoSaveTimerRef.current = null;
            }
        }, 1500);
    };

    // useEffect Auto-Save (Akan jalan otomatis setiap answers berubah)
    useEffect(() => {
        if (!currentTask?.id) return;
        if (Object.keys(answers).length === 0) return;

        triggerAutoSave(answers);
    }, [answers, currentTask]);


const handleSubmitFinal = () => {
    const taskId = currentTask?.id;

    if (!currentTask || !taskId) {
        alert("Error: Task ID tidak ditemukan!");
        return;
    }

    setIsSubmitting(true);

    router.post(`/inspection-form/${taskId}/submit`, {
        answers: answers,
    }, {
        forceFormData: true,
        preserveScroll: true,
        onSuccess: () => {
            localStorage.removeItem(`inspection_section_${taskId}`);
            localStorage.removeItem(`inspection_answers_${window.location.pathname}`);
        },
        onError: (errors: Record<string, string>) => {
            console.error("Gagal submit:", errors);

            // 💡 Petakan error backend Laravel ke masing-masing field pertanyaan dengan pesan ringkas
            Object.keys(errors).forEach((key) => {
                const match = key.match(/answers\.(\d+)\.(value|note|photos)/);
                if (match) {
                    const questionId = Number(match[1]);
                    const field = match[2] as 'value' | 'note' | 'photos';
                    
                    // Seragamkan pesan error menjadi ringkas sesuai kebutuhan Anda
                    let message = 'Wajib diisi.';
                    if (field === 'photos') {
                        message = 'Foto evidence wajib diisi untuk temuan abnormal';
                    } else if (field === 'note') {
                        message = 'Catatan wajib diisi untuk temuan abnormal';
                    }

                    setQuestionError(questionId, field, message);
                } else {
                    // Fallback jika format key-nya hanya "answers.48"
                    const generalMatch = key.match(/answers\.(\d+)/);
                    if (generalMatch && generalMatch[1]) {
                        const questionId = Number(generalMatch[1]);
                        setQuestionError(questionId, 'value', 'Wajib diisi.');
                    }
                }
            });
        },
        onFinish: () => {
            setIsSubmitting(false); // Pastikan status submitting selalu dimatikan di akhir proses
        },
    });
};

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
            <div className="flex gap-6 items-start w-full p-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
                {/* SIDEBAR: Progress Inspection */}
                <aside className="w-80 shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col max-h-[calc(100vh-7rem)] sticky top-6 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="font-semibold text-slate-800 text-base">Progress Inspection</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{currentSectionIndex + 1} dari {sections.length} section lengkap</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {sections.map((sec, index) => {
                            const isActive = currentSectionIndex === index;
                            const isDone = index <= maxCompletedIndex;

                            // Deteksi apakah section ini dilewati (skipped) karena jump section
                            const isSkipped = !isDone && !isActive && index < currentSectionIndex;

                            // 🔒 ATURAN KUNCI (DISABLED): 
                            // Jika section berstatus isSkipped, paksa isUnlocked menjadi FALSE (tidak bisa diklik)
                            const isUnlocked = !isSkipped && (
                                index === 0 ||
                                index <= maxCompletedIndex ||
                                index <= currentSectionIndex ||
                                index === currentSectionIndex + 1
                            );

                            let statusText = 'Belum dikerjakan';
                            let statusBadgeBg = 'bg-slate-100 text-slate-600';

                            if (isDone) {
                                statusText = 'Selesai';
                                statusBadgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                            } else if (isActive) {
                                statusText = 'Sedang dikerjakan';
                                statusBadgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                            } else if (isSkipped) {
                                statusText = 'Dilewati';
                                statusBadgeBg = 'bg-slate-100 text-slate-400 border border-slate-200'; // Tampilan abu-abu terkunci
                            }

                            return (
                                <div
                                    key={sec.id || index}
                                    onClick={() => {
                                        if (isUnlocked) {
                                            setCurrentSectionIndex(index);
                                        }
                                    }}
                                    className={`group flex items-start gap-3 rounded-lg p-3 text-sm transition-all ${!isUnlocked
                                        ? 'bg-slate-100/70 opacity-50 cursor-not-allowed select-none' // Style disabled (redup & kursor dilarang)
                                        : isActive
                                            ? 'bg-blue-50/60 border border-blue-200 shadow-sm cursor-pointer'
                                            : 'hover:bg-slate-50 border border-transparent cursor-pointer'
                                        }`}
                                >
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 mt-0.5 ${isDone
                                        ? 'bg-emerald-600 text-white'
                                        : isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : isSkipped
                                                ? 'bg-slate-300 text-slate-500' // Ikon gembok atau tanda strip untuk yang terkunci
                                                : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {isDone ? '✓' : isSkipped ? '🔒' : index + 1}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-[10px] text-slate-900 truncate">{sec.section_code}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadgeBg}`}>{statusText}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">{sec?.section_title}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* MAIN CONTENT FORM */}
                <main className="bg-white flex-1 border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

                    {/* Header Section */}
                    <div className="bg-white py-4 px-6 border-b border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                                Section {currentSectionIndex + 1} dari {sections.length}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{currentSection?.section_code}</span>
                        </div>
                        <h1 className="text-lg font-bold text-slate-900">{currentSection?.section_title}</h1>
                        <p>{currentSection?.section_description}</p>
                    </div>

                    <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                        {/* RENDER DAFTAR PERTANYAAN DINAMIS PER SECTION */}
                        <div className="space-y-8">
                            {currentSection?.questions && currentSection.questions.length > 0 ? (
                                currentSection.questions.map((question: any, qIndex: number) => {
                                    const ans = getAnswer(question.id);

                                    return (
                                        <div key={question.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                                            {/* Header Pertanyaan */}
                                            {questionErrors[question.id]?.value && (
    <p className="text-xs font-bold text-rose-600 mt-1.5">
        {questionErrors[question.id].value}
    </p>
)}
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                                                    Pertanyaan {qIndex + 1}
                                                </span>
                                                {/* 💡 Badge Keterangan Wajib Diisi di Kanan */}
        {question.is_required ? (
            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                * Wajib Diisi
            </span>
        ) : (
            <span className="text-[10px] text-slate-400 font-medium">
                Opsional
            </span>
        )}
                                                <h2 className="text-base font-bold text-slate-900 leading-snug">
                                                    {question.question_text} {question.is_required && <span className="text-rose-500">*</span>}
                                                </h2>

                                                {question.help_text && (
                                                    <p className="text-xs font-medium text-slate-500">
                                                        <strong className="text-slate-700">Metode:</strong> {question.help_text}
                                                    </p>
                                                )}

                                                {question.standard_text && (
                                                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs text-slate-700 mt-2">
                                                        <span className="font-semibold text-slate-900 block mb-0.5 uppercase tracking-wider text-[10px] text-slate-500">
                                                            Standar Pemeriksaan:
                                                        </span>
                                                        {question.standard_text}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Gambar Acuan Pertanyaan */}
                                            {question.question_image && (
                                                <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden p-2">
                                                    <img
                                                        src={`/storage/${question.question_image}`}
                                                        alt={question.question_text}
                                                        className="w-full max-h-[280px] object-contain rounded-lg cursor-pointer"
                                                        onClick={() => {
                                                            setZoomedImgSrc(`/storage/${question.question_image}`);
                                                            setIsImageZoomed(true);
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* INPUT TYPE RENDERING (TEXT, TEXTAREA, CHOICE, SELECT, DROPDOWN, CHECKBOX, FILE, DATE, TIME) */}
                                            <div className="pt-2">
                                                {(() => {
                                                    switch (question.input_type) {
                                                        case 'TEXT':
                                                            return (
                                                                <input
                                                                    type="text"
                                                                    value={String(ans.value || '')}
                                                                    onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                    placeholder="Jawaban singkat..."
                                                                    className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
                                                                />
                                                            );

                                                        case 'TEXTAREA':
                                                            return (
                                                                <textarea
                                                                    rows={3}
                                                                    value={String(ans.value || '')}
                                                                    onChange={(e) => handleValueChoice(question.id, e.target.value)}
                                                                    placeholder="Jawaban panjang..."
                                                                    className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
                                                                />
                                                            );

                                                        case 'SELECT':
                                                            return (
                                                                <div className="flex flex-wrap gap-3">
                                                                    {question.options && question.options.length > 0 ? (
                                                                        question.options.map((opt: any) => {
                                                                            const currentAnswer = getAnswer(question.id);
                                                                            const isSelected = currentAnswer.value === opt.id;
                                                                            return (
                                                                                <button
                                                                                    key={opt.id}
                                                                                    type="button"
                                                                                    name={`question_${question.id}`}
                                                                                    onClick={() => handleValueChoice(question.id, opt.id, opt)}
                                                                                    className={`
                                                                                        flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border 
                                                                                        transition-all cursor-pointer active:scale-95 shadow-xs
                                                                                        ${isSelected
                                                                                            ? !opt.is_normal
                                                                                                ? 'bg-rose-600 border-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/20'
                                                                                                : 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-600/20'
                                                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                                        }
                                                                                    `}
                                                                                >
                                                                                    <span>{opt.option_text}</span>
                                                                                </button>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleValueChoice(question.id, 'OK')}
                                                                                className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm border transition-all ${ans.value === 'OK' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                OK (Good)
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleValueChoice(question.id, 'NG')}
                                                                                className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm border transition-all ${ans.value === 'NG' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                NG (Not Good)
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
                                                                    className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
                                                                >
                                                                    <option value="">-- Pilih Opsi --</option>
                                                                    {question.options?.map((opt: any) => (
                                                                        <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
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
                                                                            <label key={opt.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={(e) => {
                                                                                        let updated = [...currentVals];
                                                                                        if (e.target.checked) updated.push(opt.option_text);
                                                                                        else updated = updated.filter(v => v !== opt.option_text);
                                                                                        handleValueChoice(question.id, updated);
                                                                                    }}
                                                                                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                                                                />
                                                                                <span className="text-sm font-medium text-slate-800">{opt.option_text}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );

                                                        case 'FILE':
                                                            // Parse validation_rules untuk mengambil aturan file dari admin
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
                                                                ? (Array.isArray(fileRules.allowed_file_type) ? fileRules.allowed_file_type.join(', ').toUpperCase() : fileRules.allowed_file_type)
                                                                : ' JPG,JPEG,PNG,PDF';
                                                            const maxFileSize = fileRules.max_file_size || '5MB';

                                                            const fileValue = ans.value;
                                                            const fileName = typeof fileValue === 'string' ? fileValue.split('/').pop() : (fileValue instanceof File ? fileValue.name : '');

                                                            return (
                                                                <div className="space-y-2">
                                                                    <label className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl cursor-pointer inline-flex items-center gap-2 text-xs font-semibold transition">
                                                                        <span>Pilih Berkas</span>
                                                                        <input
                                                                            type="file"
                                                                            className="hidden"
                                                                            onChange={(e) => handleFileUpload(question.id, e, question)}
                                                                        />
                                                                    </label>

                                                                    {/* 💡 Info dinamis dari allowed_file_type dan max_file_size */}
                                                                    <p className="text-[11px] text-slate-500">
                                                                        Tipe yang diizinkan: <span className="font-semibold text-slate-700">{allowedTypes}</span> | Maksimal Ukuran: <span className="font-semibold text-slate-700">{maxFileSize}</span>
                                                                    </p>

                                                                    {/* Preview file yang sudah di-upload */}
                                                                    {fileValue && (
                                                                        <div className="space-y-1 pt-1">
                                                                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                                                                                <span className="truncate max-w-[200px]">📎 {fileName}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveFile(question.id)}
                                                                                    className="text-rose-600 font-bold hover:underline cursor-pointer"
                                                                                >
                                                                                    Hapus
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        case 'DATE':
                                                            return <input type="date" value={String(ans.value || '')} onChange={(e) => handleValueChoice(question.id, e.target.value)} className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl" />;

                                                        case 'TIME':
                                                            return <input type="time" value={String(ans.value || '')} onChange={(e) => handleValueChoice(question.id, e.target.value)} className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl" />;

                                                        default:
                                                            return <input type="text" value={String(ans.value || '')} onChange={(e) => handleValueChoice(question.id, e.target.value)} className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl" />;
                                                    }
                                                })()}
                                            </div>

                                            {/* TRIGGER DINAMIS: Notes & Evidence Muncul Jika is_normal === false atau memilih 'NG' */}
                                            {(() => {
    const selectedOpt = question.options?.find((o: any) => o.id === ans.value);
    const isAbnormal = (selectedOpt && selectedOpt.is_normal === false) || ans.value === 'NG';

    if (isAbnormal) {
        return (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <span>⚠️ Temuan Abnormal (Abnormality Detected)</span>
                </div>

                {/* 1. Bagian Catatan / Notes */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Catatan / Notes <span className="text-rose-600">*</span></label>
                    <textarea
                        rows={2}
                        value={ans.note || ''}
                        onChange={(e) => handleNoteChange(question.id, e.target.value)}
                        placeholder="Jelaskan detail kerusakan..."
                        className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl"
                    />
                   {questionErrors[question.id]?.note && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2 mt-1">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{questionErrors[question.id].note}</span>
        </div>
    )}
                </div>

                {/* 2. Bagian Upload Evidence Foto */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700">
                            Upload Evidence Foto <span className="text-rose-600">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Format: JPG, JPEG, PNG (Maks. 2MB)</span>
                    </div>

                    <label className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl cursor-pointer text-xs font-semibold inline-block">
                        <span>Ambil / Pilih Foto</span>
                        <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={(e) => handleAddPhoto(question.id, e)} />
                    </label>
                    {questionErrors[question.id]?.photos && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2 mt-1">
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{questionErrors[question.id].photos}</span>
        </div>
    )}

                    {ans.photos && typeof ans.photos === 'string' && (
                        <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs pt-1 mt-2">
                            <img src={`/storage/${ans.photos}`} alt="Evidence" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => handleRemoveEvidencePhoto(question.id)}
                                className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 hover:opacity-100 transition shadow-md cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
})()}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-500 italic">Tidak ada pertanyaan pada section ini.</p>
                            )}
                        </div>
                    </div>
                </main>
            </div>

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