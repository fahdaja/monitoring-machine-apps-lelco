import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    PlusCircle, Copy, Trash2, Layers, Eye, Image as ImageIcon,
    CornerDownRight, HelpCircle, ShieldCheck, CheckCircle2, AlertCircle,
    GripVertical, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

interface ValidationRules {
    expected_answer?: string;
    validation_error_message?: string;
    allowed_file_type?: string[];
    max_file_size?: '1MB' | '5MB' | '10MB' | string;
}

interface Machine {
    machine_id: number;
    machine_code: string;
    machine_name?: string;
    location: string;
}

interface OptionItem {
    id?: number;
    option_text: string;
    is_normal: boolean;
    option_order: number;
    goto_form_section_id?: number | null;
}

interface QuestionItem {
    id?: number;
    question_text: string;
    question_image?: File | string | null;
    question_image_url?: string;
    question_images?: string[];
    existing_question_images?: string[];
    new_question_images?: File[];
    new_question_image_urls?: string[];
    question_file_url?: string;
    question_order: number;
    placeholder?: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    help_text: string;
    standard_text: string;
    is_required: boolean;
    validation_rules: ValidationRules[];
    options: OptionItem[];
}

interface SectionItem {
    id?: number;
    section_title?: string;
    section_description?: string | null;
    section_order?: number;
    questions: QuestionItem[];
}

interface FormModel {
    id: number;
    form_code: string;
    form_type?: string;
    form_title: string;
    form_description?: string;
    machine_id: number | null;
    machine: Machine | null;
    sections: SectionItem[];
    is_active: boolean;
}

interface ConditionRef {
    question_id: number | null;
    option_id: number | null;
    condition_code: string;
    target_form_title?: string | null;
}

interface Props {
    form: FormModel;
    machines?: Machine[];
    conditionRefs?: ConditionRef[];
}

interface ToastPayload {
    type: 'success' | 'error';
    title: string;
    description: string;
}

export default function FormEdit({ form, machines = [], conditionRefs = [] }: Props) {
    const { data, setData, put, post, processing, errors } = useForm({
        metadata: {
            form_code: form?.form_code || '',
            form_type: form?.form_type || 'INSPECTION',
            form_title: form?.form_title || '',
            form_description: form?.form_description || '',
            machine_id: (form?.machine_id || '') as string | number,
        },
        sections: form?.sections && form.sections.length > 0 ? form.sections.map((sec, sIdx) => ({
            id: sec.id,
            section_title: sec.section_title || `Bagian ${sIdx + 1}`,
            section_description: sec.section_description || '',
            section_order: sec.section_order || sIdx + 1,
            questions: sec.questions && sec.questions.length > 0 ? sec.questions.map((q, qIdx) => ({
                id: q.id,
                question_text: q.question_text || '',
                question_image: q.question_image || null,
                question_image_url: (typeof q.question_image === 'string' && q.question_image)
                    ? `/storage/${q.question_image}`
                    : '',
                existing_question_images: (Array.isArray((q as any).question_images) && (q as any).question_images.length > 0
                    ? (q as any).question_images
                    : (typeof q.question_image === 'string' && q.question_image ? [q.question_image] : [])) as string[],
                new_question_images: [] as File[],
                new_question_image_urls: [] as string[],
                question_file_url: q.question_file_url || '',
                question_order: q.question_order || qIdx + 1,
                input_type: q.input_type || 'SELECT',
                help_text: q.help_text || '',
                standard_text: q.standard_text || '',
                is_required: Boolean(q.is_required),
                validation_rules: q.validation_rules || { expected_answer: '', validation_error_message: '', allowed_file_type: [], max_file_size: '' },
                options: q.options && q.options.length > 0 ? q.options.map((opt, oIdx) => ({
                    id: opt.id,
                    option_text: opt.option_text || '',
                    is_normal: Boolean(opt.is_normal),
                    option_order: opt.option_order || oIdx + 1,
                    goto_form_section_id: opt.goto_form_section_id !== undefined && opt.goto_form_section_id !== null
                        ? Number(opt.goto_form_section_id)
                        : null,
                })) : [
                    { id: undefined, option_text: 'Normal (OK)', is_normal: true, option_order: 1, goto_form_section_id: null },
                    { id: undefined, option_text: 'Rusak (NG)', is_normal: false, option_order: 2, goto_form_section_id: null }
                ]
            })) : []
        })) : [
            {
                section_title: '',
                section_description: '',
                section_order: 1,
                questions: [
                    {
                        question_order: 1,
                        question_text: '',
                        input_type: 'SELECT' as const,
                        is_required: false,
                        help_text: '',
                        standard_text: '',
                        validation_rules: [{ validation_error_message: '', expected_answer: '', allowed_file_type: [], max_file_size: '' }],
                        options: [
                            { id: undefined, option_text: 'Normal (OK)', is_normal: true, option_order: 1, goto_form_section_id: null },
                            { id: undefined, option_text: 'Rusak (NG)', is_normal: false, option_order: 2, goto_form_section_id: null }
                        ],
                    }
                ],
            }
        ] as SectionItem[],
        is_active: form?.is_active ?? true,
    });

    const handleMetadataChange = (field: string, value: any) => {
        setData('metadata', { ...data.metadata, [field]: value });
    };

    const handleValidationRuleChange = (sIndex: number, qIndex: number, ruleField: keyof ValidationRules, value: any) => {
        const updated = [...data.sections];
        const currentRules = Array.isArray(updated[sIndex].questions[qIndex].validation_rules)
            ? [...updated[sIndex].questions[qIndex].validation_rules]
            : [{ expected_answer: '', validation_error_message: '', allowed_file_type: [], max_file_size: '10MB' }];

        if (currentRules.length === 0) currentRules.push({});

        currentRules[0] = { ...currentRules[0], [ruleField]: value };
        updated[sIndex].questions[qIndex].validation_rules = currentRules;
        setData('sections', updated);
    };

    const FILE_SIZE_OPTIONS = ['1MB', '5MB', '10MB'];
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [activeFocus, setActiveFocus] = useState<string | number>('HEADER');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSectionId, setPreviewSectionId] = useState<number>(0);
    const [previewHistory, setPreviewHistory] = useState<number[]>([]);
    const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [toastMessage, setToast] = useState<ToastPayload | null>(null);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    // Auto-hide toast juga (sebelumnya hanya errorMessage)
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const addSection = () => {
        const updated = [
            ...data.sections,
            {
                section_title: 'Bagian Tanpa Judul',
                section_description: '',
                section_order: data.sections.length + 1,
                questions: [
                    {
                        question_order: 1,
                        question_text: '',
                        input_type: 'SELECT' as const,
                        is_required: false,
                        help_text: '',
                        standard_text: '',
                        validation_rules: [{ validation_error_message: '', expected_answer: '', allowed_file_type: [], max_file_size: '' }],
                        options: (isTicketing
                            ? [
                                { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                                { option_text: 'Opsi 2', is_normal: true, option_order: 2, goto_form_section_id: null }
                            ]
                            : [
                                { option_text: 'Normal (OK)', is_normal: true, option_order: 1, goto_form_section_id: null },
                                { option_text: 'Rusak (NG)', is_normal: false, option_order: 2, goto_form_section_id: null }
                            ]) as OptionItem[],
                    }
                ],
            },
        ];
        setData('sections', updated);
        setActiveSectionIndex(updated.length - 1);
        setActiveFocus('SECTION_TITLE');
    };

    const addQuestionToActiveSection = () => {
        const updated = [...data.sections];
        const targetIdx =
            activeSectionIndex >= 0 && activeSectionIndex < updated.length
                ? activeSectionIndex
                : updated.length - 1;
        const newQ: QuestionItem = {
            question_text: '',
            question_order: updated[targetIdx].questions.length + 1,
            input_type: 'SELECT',
            is_required: false,
            help_text: '',
            standard_text: '',
            validation_rules: [{ expected_answer: '', validation_error_message: '', allowed_file_type: [], max_file_size: '' }],
            options: (isTicketing
                ? [
                    { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                    { option_text: 'Opsi 2', is_normal: true, option_order: 2, goto_form_section_id: null }
                ]
                : [
                    { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                    { option_text: 'Opsi 2', is_normal: false, option_order: 2, goto_form_section_id: null }
                ]) as OptionItem[],
        };

        if (typeof activeFocus === 'number' && activeFocus < updated[targetIdx].questions.length) {
            updated[targetIdx].questions.splice(activeFocus + 1, 0, newQ);
            setActiveFocus(activeFocus + 1);
        } else {
            updated[targetIdx].questions.push(newQ);
            setActiveFocus(updated[targetIdx].questions.length - 1);
        }
        setData('sections', updated);
    };

    // Ikon trash ditolak sejak klik kalau item yang dibuang masih dipakai kondisi trigger jadwal.
    const conditionRefForQuestion = (questionId?: number) =>
        questionId ? conditionRefs.find(ref => ref.question_id === questionId) : undefined;

    const conditionRefForOption = (optionId?: number) =>
        optionId ? conditionRefs.find(ref => ref.option_id === optionId) : undefined;

    const blockConditionMessage = (ref: ConditionRef, what: string) =>
        `${what} masih dipakai kondisi trigger jadwal untuk form (${ref.target_form_title || ref.condition_code}). Hapus atau ubah kondisi itu di halaman Pengaturan Pola Jadwal dulu.`;

    const removeSection = (sIndex: number) => {
        if (data.sections.length <= 1) return;
        const section = data.sections[sIndex];
        const refQuestion = section.questions.map(q => conditionRefForQuestion(q.id)).find(Boolean);
        const refOption = section.questions
            .flatMap(q => q.options ?? [])
            .map(o => conditionRefForOption(o.id))
            .find(Boolean);
        if (refQuestion) {
            setErrorMessage(blockConditionMessage(refQuestion, 'Bagian ini memuat pertanyaan yang'));
            return;
        }
        if (refOption) {
            setErrorMessage(blockConditionMessage(refOption, 'Bagian ini memuat jawaban yang'));
            return;
        }
        const updated = data.sections.filter((_, i) => i !== sIndex);
        setData('sections', updated);
        setActiveSectionIndex(Math.max(0, sIndex - 1));
        setActiveFocus('HEADER');
    };

    const removeQuestion = (sIndex: number, qIndex: number) => {
        const section = data.sections[sIndex];
        const question = section.questions[qIndex];

        if (section.questions.length <= 1) {
            setErrorMessage(`Bagian ${sIndex + 1} harus memiliki minimal 1 pertanyaan.`);
            return;
        }

        const refQuestion = conditionRefForQuestion(question.id);
        if (refQuestion) {
            setErrorMessage(blockConditionMessage(refQuestion, 'Pertanyaan ini'));
            return;
        }

        const refOption = (question.options ?? []).map(o => conditionRefForOption(o.id)).find(Boolean);
        if (refOption) {
            setErrorMessage(blockConditionMessage(refOption, 'Salah satu jawaban pertanyaan ini'));
            return;
        }

        const updated = [...data.sections];
        updated[sIndex].questions = updated[sIndex].questions.filter((_, i) => i !== qIndex);
        setData('sections', updated);
        setActiveFocus(Math.max(0, qIndex - 1));
    };

    const removeOption = (sIndex: number, qIndex: number, oIndex: number) => {
        const question = data.sections[sIndex].questions[qIndex];
        const option = question.options[oIndex];

        const refOption = conditionRefForOption(option.id);
        if (refOption) {
            setErrorMessage(blockConditionMessage(refOption, 'Jawaban ini'));
            return;
        }

        handleQuestionChange(sIndex, qIndex, 'options', question.options.filter((_, i) => i !== oIndex));
    };

    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
    const toggleCollapseSection = (sIndex: number) => {
        setCollapsedSections(prev => ({ ...prev, [sIndex]: !prev[sIndex] }));
    };

    const totalQuestions = data.sections.reduce((acc, sec) => acc + sec.questions.length, 0);

    const formTypeLabelMap: Record<string, string> = {
        INSPECTION: 'Inspeksi Preventive',
        MANUAL_REPORT: 'Laporan Breakdown Manual',
        START_REPAIR: 'Form Mulai Repair',
        CLOSE_TICKET: 'Form Tutup Tiket',
    };

    const getQuestionConditionRefs = (questionId?: number) =>
        questionId ? conditionRefs.filter(ref => ref.question_id === questionId) : [];

    const getOptionConditionRefs = (optionId?: number | null) =>
        optionId ? conditionRefs.filter(ref => ref.option_id === optionId) : [];

    const [draggingQuestion, setDraggingQuestion] = useState<{ sIndex: number; qIndex: number } | null>(null);
    const [dragOverQuestion, setDragOverQuestion] = useState<{ sIndex: number; qIndex: number } | null>(null);
    const dragArmedRef = React.useRef(false);

    const reorderQuestion = (sIndex: number, fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const questions = data.sections[sIndex]?.questions || [];
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= questions.length || toIndex >= questions.length) return;

        const updated = [...data.sections];
        const nextQuestions = [...updated[sIndex].questions];
        const [moved] = nextQuestions.splice(fromIndex, 1);
        nextQuestions.splice(toIndex, 0, moved);
        updated[sIndex] = {
            ...updated[sIndex],
            questions: nextQuestions.map((item, idx) => ({ ...item, question_order: idx + 1 })),
        };
        setData('sections', updated);
        setActiveSectionIndex(sIndex);
        setActiveFocus(toIndex);
    };

    const duplicateQuestion = (sIndex: number, qIndex: number) => {
        const updated = [...data.sections];
        const target = updated[sIndex].questions[qIndex];
        const dup = { ...target, options: target.options.map(o => ({ ...o })) };
        updated[sIndex].questions.splice(qIndex + 1, 0, dup);
        setData('sections', updated);
        setActiveFocus(qIndex + 1);
    };

    const handleQuestionChange = (sIndex: number, qIndex: number, field: keyof QuestionItem, value: any) => {
        const updated = [...data.sections];
        updated[sIndex].questions[qIndex] = { ...updated[sIndex].questions[qIndex], [field]: value };
        setData('sections', updated);
    };

    const handleSectionChange = (sIndex: number, field: 'section_title' | 'section_description', value: string) => {
        const updated = [...data.sections];
        updated[sIndex][field] = value;
        setData('sections', updated);
    };

    const handleQuestionImageUpload = (sIndex: number, qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const invalid = files.some((f) => !f.type.startsWith('image/'));
        if (invalid) {
            alert('Semua file yang dipilih harus berupa gambar!');
            e.target.value = '';
            return;
        }

        const updated = [...data.sections];
        const current = updated[sIndex].questions[qIndex];
        updated[sIndex].questions[qIndex] = {
            ...current,
            new_question_images: [...(current.new_question_images || []), ...files],
            new_question_image_urls: [...(current.new_question_image_urls || []), ...files.map((f) => URL.createObjectURL(f))],
        };
        setData('sections', updated);
        e.target.value = '';
    };

    const removeExistingQuestionImage = (sIndex: number, qIndex: number, imgIndex: number) => {
        const updated = [...data.sections];
        const current = updated[sIndex].questions[qIndex];
        updated[sIndex].questions[qIndex] = {
            ...current,
            existing_question_images: (current.existing_question_images || []).filter((_, i) => i !== imgIndex),
        };
        setData('sections', updated);
    };

    const removeNewQuestionImage = (sIndex: number, qIndex: number, imgIndex: number) => {
        const updated = [...data.sections];
        const current = updated[sIndex].questions[qIndex];
        updated[sIndex].questions[qIndex] = {
            ...current,
            new_question_images: (current.new_question_images || []).filter((_, i) => i !== imgIndex),
            new_question_image_urls: (current.new_question_image_urls || []).filter((_, i) => i !== imgIndex),
        };
        setData('sections', updated);
    };

    const toggleHelpText = (sIndex: number, qIndex: number) => {
        const updated = [...data.sections];
        const q = updated[sIndex].questions[qIndex];
        q.help_text = q.help_text ? '' : ' ';
        setData('sections', updated);
    };

    const toggleStandardText = (sIndex: number, qIndex: number) => {
        const updated = [...data.sections];
        const q = updated[sIndex].questions[qIndex];
        q.standard_text = q.standard_text ? '' : ' ';
        setData('sections', updated);
    };

    // Form transisi (mulai repair / tutup tiket) berlaku untuk semua mesin
    const requiresMachine = ['INSPECTION', 'MANUAL_REPORT'].includes(data.metadata.form_type);

    // Keluarga "ticketing" (report/repair/close) = data entry murni: builder
    // menyembunyikan Standard Text, penanda normal/abnormal opsi & jump-logic.
    const isTicketing = ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'].includes(data.metadata.form_type);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!data.metadata.form_title || data.metadata.form_title.trim() === '') {
            setErrorMessage("Judul Formulir tidak boleh kosong!");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        for (let sIndex = 0; sIndex < data.sections.length; sIndex++) {
            const section = data.sections[sIndex];

            if (!section.questions || section.questions.length === 0) {
                setErrorMessage(`Bagian ${sIndex + 1} harus memiliki minimal 1 pertanyaan.`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (!isTicketing && (!section.section_title || section.section_title.trim() === '')) {
                setErrorMessage(`Judul pada Bagian ${sIndex + 1} tidak boleh kosong!`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
                const q = section.questions[qIndex];

                if (!q.question_text || q.question_text.trim() === '') {
                    setErrorMessage(`Pertanyaan ke-${qIndex + 1} di Bagian ${sIndex + 1} masih kosong.`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }

                if (['SELECT', 'CHECKBOX', 'DROPDOWN'].includes(q.input_type)) {
                    if (!q.options || q.options.length === 0) {
                        setErrorMessage(`Pertanyaan "${q.question_text}" harus memiliki minimal 1 opsi jawaban!`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                    }

                    for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
                        if (!q.options[oIndex].option_text || q.options[oIndex].option_text.trim() === '') {
                            setErrorMessage(`Teks Opsi ke-${oIndex + 1} pada Pertanyaan ke-${qIndex + 1} (Bagian ${sIndex + 1}) masih kosong!`);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return;
                        }
                    }
                }
            }
        }

        const preparedSections = data.sections.map(section => ({
            ...section,
            questions: section.questions.map(q => ({
                ...q,
                validation_rules: q.validation_rules,
                options: q.options.map(opt => ({
                    id: opt.id ?? null,
                    option_text: opt.option_text,
                    is_normal: opt.is_normal,
                    option_order: opt.option_order,
                    goto_form_section_id: opt.goto_form_section_id ? Number(opt.goto_form_section_id) : null
                }))
            }))
        }));

        router.post(`/forms/${form.id}`, {
            _method: 'PUT',
            ...data,
            sections: preparedSections,
        }, {
            forceFormData: true,
            onSuccess: () => {
                setToast({ type: 'success', title: 'Berhasil Disimpan', description: 'Template form berhasil diperbarui.' });
            },
            onError: (errors) => {
                // Error paling relevan dulu: pesan kondisi trigger > pesan validasi lain > teks generik.
                const firstError = errors?.condition || (Object.values(errors ?? {}) as Array<string | string[]>)[0];
                const description = typeof firstError === 'string' ? firstError : firstError?.[0];
                setToast({ type: 'error', title: 'Gagal Menyimpan', description: description || 'Periksa kembali inputan Anda.' });
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`Edit Template Form - ${form?.form_title || ''}`} />

            {/* TOAST — ditambahkan (sebelumnya tidak dirender) */}
            {toastMessage && (
                <div className="fixed z-[9999] bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 flex flex-col items-end">
                    <div className="bg-white text-slate-900 px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-200 flex items-start gap-3 w-full sm:w-80 max-w-full">
                        <div className="shrink-0 mt-0.5">
                            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 break-words">{toastMessage.title}</p>
                            {toastMessage.description && (
                                <p className="text-[11px] text-slate-500 break-words">{toastMessage.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ERROR MESSAGE — responsive */}
            {errorMessage && (
                <div className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 sm:max-w-md bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-rose-700">
                    <span className="break-words">⚠️ {errorMessage}</span>
                </div>
            )}

            {/* HEADER — responsive */}
            <div className="max-w-3xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Edit Template Form</h1>
                    <p className="text-[11px] sm:text-xs text-slate-500">Perbarui cetak biru (blueprint) pertanyaan inspeksi mesin.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => { setPreviewSectionId(0); setPreviewHistory([]); setPreviewAnswers({}); setIsPreviewOpen(true); }}
                        className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <Link
                        href="/forms"
                        className="flex-1 sm:flex-none px-3 sm:px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors text-center"
                    >
                        Kembali
                    </Link>
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-4 pb-24">
                {/* Metadata */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-2xs border-t-4 border-t-emerald-600">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {formTypeLabelMap[data.metadata.form_type] || data.metadata.form_type}
                            </span>
                            {data.metadata.form_code && (
                                <span className="text-[10px] font-mono text-slate-400">{data.metadata.form_code}</span>
                            )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            {data.sections.length} Bagian &bull; {totalQuestions} Pertanyaan
                        </span>
                    </div>
                    <input
                        type="text"
                        value={data.metadata.form_title}
                        onChange={e => handleMetadataChange('form_title', e.target.value)}
                        placeholder="Judul Formulir"
                        className="w-full text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 focus:border-emerald-600 focus:outline-none bg-transparent"
                    />
                    <input
                        type="text"
                        value={data.metadata.form_description}
                        onChange={e => handleMetadataChange('form_description', e.target.value)}
                        placeholder="Deskripsi singkat formulir (opsional)"
                        className="w-full text-xs text-slate-600 border-b border-slate-100 pb-2 focus:border-emerald-600 focus:outline-none bg-transparent"
                    />
                </div>

                <form onSubmit={submit} className="space-y-4">
                    {data.sections.map((section, sIndex) => (
                        <div key={sIndex} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs border-l-4 border-l-emerald-600">
                            {!isTicketing && (
                            <>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[11px] font-bold text-emerald-700 uppercase shrink-0">
                                        Bagian {sIndex + 1}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                                        {section.questions.length} Pertanyaan
                                    </span>
                                    {collapsedSections[sIndex] && section.section_title && (
                                        <span className="text-xs font-bold text-slate-700 truncate">
                                            — {section.section_title}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleCollapseSection(sIndex)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200 cursor-pointer"
                                    >
                                        {collapsedSections[sIndex] ? (
                                            <>
                                                <ChevronDown className="w-3.5 h-3.5" /> Buka
                                            </>
                                        ) : (
                                            <>
                                                <ChevronUp className="w-3.5 h-3.5" /> Lipat
                                            </>
                                        )}
                                    </button>
                                    {data.sections.length > 1 && (
                                        <button type="button" onClick={() => removeSection(sIndex)} className="text-slate-400 hover:text-rose-600 text-xs cursor-pointer shrink-0">
                                            Hapus Bagian
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!collapsedSections[sIndex] && (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={section.section_title}
                                    onChange={e => handleSectionChange(sIndex, 'section_title', e.target.value)}
                                    placeholder="Judul Bagian (Contoh: Inspeksi Komponen Utama)"
                                    className="w-full text-sm sm:text-base font-bold text-slate-800 border-b border-slate-100 pb-1.5 focus:border-emerald-600 outline-none bg-transparent"
                                />
                                <input
                                    type="text"
                                    value={section.section_description || ''}
                                    onChange={e => handleSectionChange(sIndex, 'section_description', e.target.value)}
                                    placeholder="Deskripsi bagian (opsional)"
                                    className="w-full text-xs text-slate-500 border-b border-slate-100 pb-1.5 focus:border-emerald-600 outline-none bg-transparent"
                                />
                            </div>
                            )}
                            </>
                            )}

                            {!collapsedSections[sIndex] && (
                            <div className="space-y-3">
                                {section.questions.map((q, qIndex) => {
                                    const qCondRefs = getQuestionConditionRefs(q.id);
                                    const isDragging = draggingQuestion?.sIndex === sIndex && draggingQuestion?.qIndex === qIndex;
                                    const isDragOver =
                                        dragOverQuestion?.sIndex === sIndex &&
                                        dragOverQuestion?.qIndex === qIndex &&
                                        draggingQuestion?.sIndex === sIndex &&
                                        draggingQuestion?.qIndex !== qIndex;

                                    return (
                                    <div
                                        key={qIndex}
                                        draggable
                                        onDragStart={e => {
                                            if (!dragArmedRef.current) {
                                                e.preventDefault();
                                                return;
                                            }
                                            setDraggingQuestion({ sIndex, qIndex });
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.dataTransfer.setData('text/plain', `${sIndex}:${qIndex}`);
                                        }}
                                        onDragOver={e => {
                                            if (draggingQuestion && draggingQuestion.sIndex === sIndex) {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                                if (dragOverQuestion?.sIndex !== sIndex || dragOverQuestion?.qIndex !== qIndex) {
                                                    setDragOverQuestion({ sIndex, qIndex });
                                                }
                                            }
                                        }}
                                        onDrop={e => {
                                            e.preventDefault();
                                            if (draggingQuestion && draggingQuestion.sIndex === sIndex) {
                                                reorderQuestion(sIndex, draggingQuestion.qIndex, qIndex);
                                            }
                                            setDraggingQuestion(null);
                                            setDragOverQuestion(null);
                                            dragArmedRef.current = false;
                                        }}
                                        onDragEnd={() => {
                                            setDraggingQuestion(null);
                                            setDragOverQuestion(null);
                                            dragArmedRef.current = false;
                                        }}
                                        onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus(qIndex); }}
                                        className={`bg-white p-3 sm:p-5 rounded-xl border shadow-2xs space-y-3 transition-all ${
                                            isDragging
                                                ? 'opacity-50 border-dashed border-emerald-400'
                                                : isDragOver
                                                ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/20'
                                                : activeSectionIndex === sIndex && activeFocus === qIndex
                                                ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {qCondRefs.length > 0 && (
                                            <div
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800"
                                                title={`Digunakan oleh kondisi: ${qCondRefs.map(r => r.target_form_title || r.condition_code).join(', ')}`}
                                            >
                                                <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                                Dipakai Kondisi Trigger ({qCondRefs.map(r => r.target_form_title || r.condition_code).join(', ')})
                                            </div>
                                        )}

                                        {/* Baris pertanyaan — responsive */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
                                                <button
                                                    type="button"
                                                    onMouseDown={() => { dragArmedRef.current = true; }}
                                                    onMouseUp={() => { dragArmedRef.current = false; }}
                                                    className="p-1 text-slate-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing shrink-0"
                                                    title="Tarik untuk mengubah urutan pertanyaan"
                                                >
                                                    <GripVertical className="w-4 h-4" />
                                                </button>
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black shrink-0">
                                                    #{qIndex + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={q.question_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'question_text', e.target.value)}
                                                    placeholder={`Tulis pertanyaan ${qIndex + 1}...`}
                                                    className="w-full flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50/50 outline-none focus:border-emerald-600"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <input
                                                    type="file"
                                                    id={`q-img-${sIndex}-${qIndex}`}
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={e => handleQuestionImageUpload(sIndex, qIndex, e)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => document.getElementById(`q-img-${sIndex}-${qIndex}`)?.click()}
                                                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer shrink-0"
                                                    title="Sisipkan Gambar (bisa lebih dari 1)"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>

                                                <select
                                                    value={q.input_type}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'input_type', e.target.value)}
                                                    className="flex-1 sm:flex-none sm:w-32 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none"
                                                >
                                                    <option value="TEXT">Singkat</option>
                                                    <option value="TEXTAREA">Paragraf</option>
                                                    <option value="SELECT">Pilihan Ganda</option>
                                                    <option value="CHECKBOX">Checkbox</option>
                                                    <option value="DROPDOWN">Dropdown</option>
                                                    <option value="FILE">File</option>
                                                    <option value="DATE">Tanggal</option>
                                                    <option value="TIME">Waktu</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Toggle Help/Standard — wrap */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleHelpText(sIndex, qIndex)}
                                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${q.help_text ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                <HelpCircle className="w-3 h-3" /> {q.help_text ? 'Help Text Aktif' : '+ Help Text'}
                                            </button>
                                            {!isTicketing && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleStandardText(sIndex, qIndex)}
                                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${q.standard_text ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                                >
                                                    <ShieldCheck className="w-3 h-3" /> {q.standard_text ? 'Standard Text Aktif' : '+ Standard Text'}
                                                </button>
                                            )}
                                        </div>

                                        {q.help_text !== '' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={q.help_text || ''}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'help_text', e.target.value)}
                                                    placeholder="Tuliskan panduan / help text..."
                                                    className="w-full border border-sky-200 bg-sky-50/40 rounded-lg px-3 py-1.5 text-xs text-sky-900 outline-none"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'help_text', '')} className="text-slate-400 hover:text-rose-600 font-bold shrink-0">&times;</button>
                                            </div>
                                        )}

                                        {!isTicketing && q.standard_text !== '' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={q.standard_text || ''}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                    placeholder="Tuliskan nilai standar / acuan baku..."
                                                    className="w-full border border-emerald-200 bg-emerald-50/40 rounded-lg px-3 py-1.5 text-xs text-emerald-900 outline-none"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'standard_text', '')} className="text-slate-400 hover:text-rose-600 font-bold shrink-0">&times;</button>
                                            </div>
                                        )}

                                        {(() => {
                                            const existingImgs = q.existing_question_images || [];
                                            const newUrls = q.new_question_image_urls || [];
                                            const totalImgs = existingImgs.length + newUrls.length;
                                            if (totalImgs === 0) return null;
                                            return (
                                                <div className={`mt-2 ${totalImgs === 1 ? 'w-full' : 'flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2'}`}>
                                                    {existingImgs.map((imgPath, imgIdx) => (
                                                        <div key={`ex-${imgIdx}`} className={`relative ${totalImgs === 1 ? 'w-full' : 'shrink-0 w-64 snap-start'}`}>
                                                            <img
                                                                src={`/storage/${imgPath}`}
                                                                alt={`Preview Soal ${imgIdx + 1}`}
                                                                className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 object-contain"
                                                            />
                                                            {totalImgs > 1 && (
                                                                <span className="absolute top-1.5 left-1.5 bg-slate-900/75 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                    {imgIdx + 1}/{totalImgs}
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExistingQuestionImage(sIndex, qIndex, imgIdx)}
                                                                className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                                title="Hapus Gambar"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {newUrls.map((imgUrl, imgIdx) => (
                                                        <div key={`new-${imgIdx}`} className={`relative ${totalImgs === 1 ? 'w-full' : 'shrink-0 w-64 snap-start'}`}>
                                                            <img
                                                                src={imgUrl}
                                                                alt={`Preview Baru ${imgIdx + 1}`}
                                                                className="w-full h-48 rounded-lg border border-emerald-200 bg-slate-50 object-contain"
                                                            />
                                                            {totalImgs > 1 && (
                                                                <span className="absolute top-1.5 left-1.5 bg-emerald-700/85 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                    {existingImgs.length + imgIdx + 1}/{totalImgs}
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNewQuestionImage(sIndex, qIndex, imgIdx)}
                                                                className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                                title="Hapus Gambar"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {q.input_type === 'TEXT' && (
                                            <input type="text" disabled placeholder="Jawaban singkat..." className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-400" />
                                        )}
                                        {q.input_type === 'TEXTAREA' && (
                                            <textarea disabled rows={2} placeholder="Jawaban paragraf..." className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-400 resize-none" />
                                        )}
                                        {q.input_type === 'FILE' && (
                                            <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center text-xs text-slate-400 bg-slate-50">Upload File Area</div>
                                        )}
                                        {q.input_type === 'DATE' && (
                                            <input type="date" disabled className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-400" />
                                        )}
                                        {q.input_type === 'TIME' && (
                                            <input type="time" disabled className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-400" />
                                        )}

                                        {(['SELECT', 'CHECKBOX', 'DROPDOWN'] as string[]).includes(q.input_type) && (
                                            <div className="space-y-2 bg-slate-50/60 p-2.5 sm:p-3 rounded-lg border border-slate-100">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className="text-slate-400 w-3 shrink-0">{oIndex + 1}.</span>
                                                            {!isTicketing && (
                                                                <button
                                                                    type="button"
                                                                    title="Tandai opsi ini sebagai temuan abnormal"
                                                                    onClick={() => {
                                                                        const opts = [...q.options];
                                                                        opts[oIndex].is_normal = !opts[oIndex].is_normal;
                                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                    }}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase cursor-pointer shrink-0 ${opt.is_normal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                                                                >
                                                                    {opt.is_normal ? 'Normal' : 'Abnormal'}
                                                                </button>
                                                            )}
                                                            <input
                                                                type="text"
                                                                value={opt.option_text}
                                                                onChange={e => {
                                                                    const opts = [...q.options];
                                                                    opts[oIndex].option_text = e.target.value;
                                                                    handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                }}
                                                                className="flex-1 min-w-0 border border-slate-200 rounded px-2.5 py-1 text-xs outline-none bg-slate-50"
                                                            />
                                                            {getOptionConditionRefs(opt.id).length > 0 && (
                                                                <span
                                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0"
                                                                    title="Opsi ini menjadi pemicu Kondisi Trigger"
                                                                >
                                                                    <Zap className="w-2.5 h-2.5" /> Trigger
                                                                </span>
                                                            )}
                                                        </div>

                                                        {!isTicketing && q.input_type === 'SELECT' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <select
                                                                    value={opt.goto_form_section_id ?? ''}
                                                                    onChange={e => {
                                                                        const opts = [...q.options];
                                                                        opts[oIndex].goto_form_section_id = e.target.value ? Number(e.target.value) : null;
                                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                    }}
                                                                    className="flex-1 border border-emerald-200 bg-emerald-50/40 rounded px-2 py-1 text-[11px] font-semibold text-emerald-900 outline-none"
                                                                >
                                                                    <option value="">Lanjut Default</option>
                                                                    {data.sections.map((sec, targetIdx) => {
                                                                        if (targetIdx <= sIndex) return null;
                                                                        return (
                                                                            <option key={targetIdx} value={sec.id ?? targetIdx}>
                                                                                Bagian {targetIdx + 1}: {sec.section_title || 'Tanpa Judul'}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        )}

                                                        {q.options.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOption(sIndex, qIndex, oIndex)}
                                                                className="text-slate-400 hover:text-rose-600 px-1.5 font-bold cursor-pointer self-end sm:self-center shrink-0"
                                                            >
                                                                &times;
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const opts = [...q.options, { option_text: `Opsi ${q.options.length + 1}`, is_normal: false, option_order: q.options.length + 1, goto_form_section_id: null }];
                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                    }}
                                                    className="text-emerald-700 font-semibold text-xs hover:underline pt-1 inline-block cursor-pointer"
                                                >
                                                    + Tambah Opsi
                                                </button>
                                            </div>
                                        )}

                                        {(q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && (() => {
                                            const currentRule = q.validation_rules?.[0]?.expected_answer || '';
                                            const isLegacyCustom = currentRule !== '' && currentRule !== 'angka' && currentRule !== 'huruf';
                                            return (
                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-xs text-slate-500 pt-1">
                                                    <span className="font-semibold text-[11px] text-slate-600 shrink-0">Validasi:</span>
                                                    <select
                                                        value={currentRule}
                                                        onChange={e => handleValidationRuleChange(sIndex, qIndex, 'expected_answer', e.target.value)}
                                                        className="sm:w-48 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"
                                                    >
                                                        <option value="">Tanpa Validasi (Bebas)</option>
                                                        <option value="angka">Harus Angka</option>
                                                        <option value="huruf">Harus Huruf / Teks</option>
                                                        {isLegacyCustom && (
                                                            <option value={currentRule}>Kustom: {currentRule}</option>
                                                        )}
                                                    </select>
                                                    {currentRule && (
                                                        <input
                                                            type="text"
                                                            value={q.validation_rules?.[0]?.validation_error_message || ''}
                                                            onChange={e => handleValidationRuleChange(sIndex, qIndex, 'validation_error_message', e.target.value)}
                                                            placeholder="Pesan error kustom (opsional)..."
                                                            className="flex-1 border-b border-slate-200 py-1 bg-transparent text-xs outline-none focus:border-emerald-600"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {q.input_type === 'FILE' && (
                                            <div className="space-y-2 bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200 text-xs">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                    <div>
                                                        <span className="font-semibold text-slate-700 block mb-1">Tipe File yang Diperbolehkan:</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['jpg', 'jpeg', 'png', 'pdf'].map(type => {
                                                                const currentAllowed = q.validation_rules?.[0]?.allowed_file_type || [];
                                                                const isChecked = currentAllowed.includes(type);
                                                                return (
                                                                    <label key={type} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer text-[11px] font-medium">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={e => {
                                                                                let updatedTypes = [...currentAllowed];
                                                                                if (e.target.checked) updatedTypes.push(type);
                                                                                else updatedTypes = updatedTypes.filter(t => t !== type);
                                                                                handleValidationRuleChange(sIndex, qIndex, 'allowed_file_type', updatedTypes);
                                                                            }}
                                                                            className="rounded border-slate-300 text-emerald-600 w-3 h-3"
                                                                        />
                                                                        {type}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-700 block mb-1">Maksimal Ukuran:</span>
                                                        <select
                                                            value={q.validation_rules?.[0]?.max_file_size || '10MB'}
                                                            onChange={e => handleValidationRuleChange(sIndex, qIndex, 'max_file_size', e.target.value)}
                                                            className="border border-slate-200 rounded px-2 py-1 bg-white text-xs font-semibold outline-none"
                                                        >
                                                            {FILE_SIZE_OPTIONS.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                                            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={q.is_required}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'is_required', e.target.checked)}
                                                    className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                                                />
                                                Wajib Diisi
                                            </label>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button type="button" onClick={() => duplicateQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-emerald-600 cursor-pointer" title="Duplikat"><Copy className="w-3.5 h-3.5" /></button>
                                                <button type="button" onClick={() => removeQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setActiveSectionIndex(sIndex); addQuestionToActiveSection(); }}
                                        className="w-full sm:w-auto px-4 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Tambah Pertanyaan
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>
                    ))}

                    {/* Sticky Action Bar */}
                    <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                            {!isTicketing && (
                                <button
                                    type="button"
                                    onClick={addSection}
                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Layers className="w-4 h-4" /> Tambah Bagian
                                </button>
                            )}
                            <span className="text-[11px] font-semibold text-slate-500">
                                {data.sections.length} Bagian &bull; {totalQuestions} Pertanyaan
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { setPreviewSectionId(0); setPreviewHistory([]); setPreviewAnswers({}); setIsPreviewOpen(true); }}
                                className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Eye className="w-3.5 h-3.5" /> Preview
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan Form'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* MODAL PREVIEW — responsive */}
            {isPreviewOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
                        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex items-center justify-between shrink-0 gap-2">
                            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 truncate">
                                Preview Mode (Bagian {previewSectionId + 1})
                            </span>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer shrink-0">&times;</button>
                        </div>
                        <div className="p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1 bg-slate-50">
                            {previewSectionId === 0 && (
                                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl space-y-1">
                                    <h2 className="text-base sm:text-lg font-bold break-words">{data.metadata.form_title || 'Formulir Pemantauan'}</h2>
                                    {data.metadata.form_description && <p className="text-xs text-slate-300 break-words">{data.metadata.form_description}</p>}
                                    <div className="pt-2 text-[11px] text-emerald-400 font-semibold">
                                        Tipe: {data.metadata.form_type}
                                    </div>
                                </div>
                            )}

                            {previewSectionId > 0 && data.sections[previewSectionId]?.section_title && (
                                <div className="bg-emerald-900 text-white p-3 sm:p-4 rounded-xl space-y-1">
                                    <h3 className="text-sm sm:text-base font-bold break-words">{data.sections[previewSectionId].section_title}</h3>
                                    {data.sections[previewSectionId].section_description && (
                                        <p className="text-xs text-emerald-200 break-words">{data.sections[previewSectionId].section_description}</p>
                                    )}
                                </div>
                            )}

                            {data.sections[previewSectionId]?.questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                                    <label className="text-xs font-bold text-slate-800 block break-words">
                                        {qIndex + 1}. {q.question_text || 'Pertanyaan Tanpa Judul'} {q.is_required && <span className="text-rose-500">*</span>}
                                    </label>

                                    {q.help_text && q.help_text.trim() !== '' && (
                                        <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 p-2 rounded-lg break-words">
                                            💡 <strong>Panduan:</strong> {q.help_text}
                                        </p>
                                    )}

                                    {q.standard_text && q.standard_text.trim() !== '' && (
                                        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg break-words">
                                            🛡️ <strong>Standar Acuan:</strong> {q.standard_text}
                                        </p>
                                    )}

                                    {(() => {
                                        const previewImgs = [
                                            ...(q.existing_question_images || []).map((p) => `/storage/${p}`),
                                            ...(q.new_question_image_urls || []),
                                        ];
                                        if (previewImgs.length === 0) return null;
                                        return (
                                            <div className={`pt-1 ${previewImgs.length === 1 ? 'w-full' : 'flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2'}`}>
                                                {previewImgs.map((src, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={src}
                                                        alt={`Preview Soal ${idx + 1}`}
                                                        className={`h-52 rounded-lg border border-slate-200 bg-slate-50 object-contain ${previewImgs.length === 1 ? 'w-full' : 'shrink-0 w-[85%] snap-center'}`}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {q.input_type === 'TEXT' && (
                                        <input
                                            type="text"
                                            placeholder="Ketik jawaban singkat di sini..."
                                            value={previewAnswers[`q_${previewSectionId}_${qIndex}`] || ''}
                                            onChange={e => setPreviewAnswers(prev => ({ ...prev, [`q_${previewSectionId}_${qIndex}`]: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-emerald-600"
                                        />
                                    )}
                                    {q.input_type === 'TEXTAREA' && (
                                        <textarea
                                            rows={2}
                                            placeholder="Ketik jawaban paragraf di sini..."
                                            value={previewAnswers[`q_${previewSectionId}_${qIndex}`] || ''}
                                            onChange={e => setPreviewAnswers(prev => ({ ...prev, [`q_${previewSectionId}_${qIndex}`]: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-emerald-600 resize-none"
                                        />
                                    )}
                                    {q.input_type === 'FILE' && (
                                        <div className="space-y-1">
                                            <input type="file" className="w-full border border-dashed border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                                            <span className="text-[10px] text-slate-400 block">Maksimal ukuran file: {q.validation_rules?.[0]?.max_file_size || '10MB'}</span>
                                        </div>
                                    )}
                                    {q.input_type === 'DATE' && (
                                        <input
                                            type="date"
                                            value={previewAnswers[`q_${previewSectionId}_${qIndex}`] || ''}
                                            onChange={e => setPreviewAnswers(prev => ({ ...prev, [`q_${previewSectionId}_${qIndex}`]: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-emerald-600"
                                        />
                                    )}
                                    {q.input_type === 'TIME' && (
                                        <input
                                            type="time"
                                            value={previewAnswers[`q_${previewSectionId}_${qIndex}`] || ''}
                                            onChange={e => setPreviewAnswers(prev => ({ ...prev, [`q_${previewSectionId}_${qIndex}`]: e.target.value }))}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-emerald-600"
                                        />
                                    )}

                                    {(['SELECT', 'CHECKBOX', 'DROPDOWN'] as string[]).includes(q.input_type) && (
                                        <div className="space-y-1.5 pt-1">
                                            {q.input_type === 'DROPDOWN' ? (
                                                <select
                                                    value={previewAnswers[`q_${previewSectionId}_${qIndex}`] || ''}
                                                    onChange={e => setPreviewAnswers(prev => ({ ...prev, [`q_${previewSectionId}_${qIndex}`]: e.target.value }))}
                                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 outline-none focus:border-emerald-600 font-medium"
                                                >
                                                    <option value="">Pilih opsi...</option>
                                                    {q.options.map((opt, oIdx) => (
                                                        <option key={oIdx} value={opt.option_text}>
                                                            {opt.option_text}{!isTicketing ? ` (${opt.is_normal ? 'Normal' : 'Abnormal'})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center justify-between text-xs text-slate-700 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                                            <input
                                                                type={q.input_type === 'CHECKBOX' ? 'checkbox' : 'radio'}
                                                                name={`prev_${previewSectionId}_${qIndex}`}
                                                                checked={previewAnswers[`q_${previewSectionId}_${qIndex}`] === opt.option_text}
                                                                onChange={() => {
                                                                    setPreviewAnswers(prev => ({
                                                                        ...prev,
                                                                        [`q_${previewSectionId}_${qIndex}`]: opt.option_text,
                                                                        [`goto_${previewSectionId}_${qIndex}`]: opt.goto_form_section_id
                                                                    }));
                                                                }}
                                                                className="text-emerald-600 rounded cursor-pointer shrink-0"
                                                            />
                                                            <span className="font-medium text-slate-800 break-words">{opt.option_text}</span>
                                                        </label>
                                                        {!isTicketing && (
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${opt.is_normal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                {opt.is_normal ? 'Normal' : 'Abnormal'}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="bg-white px-4 sm:px-5 py-3 border-t border-slate-200 flex justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    if (previewHistory.length > 0) {
                                        setPreviewSectionId(previewHistory[previewHistory.length - 1]);
                                        setPreviewHistory(prev => prev.slice(0, -1));
                                    }
                                }}
                                disabled={previewHistory.length === 0}
                                className="px-3 sm:px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    let nextTarget = previewSectionId + 1;
                                    const currentSecQuestions = data.sections[previewSectionId]?.questions || [];
                                    for (let i = 0; i < currentSecQuestions.length; i++) {
                                        const gotoVal = previewAnswers[`goto_${previewSectionId}_${i}`];
                                        if (gotoVal !== undefined && gotoVal !== '') {
                                            nextTarget = Number(gotoVal);
                                            break;
                                        }
                                    }
                                    if (nextTarget < data.sections.length) {
                                        setPreviewHistory(prev => [...prev, previewSectionId]);
                                        setPreviewSectionId(nextTarget);
                                    } else {
                                        alert("Uji coba preview Selesai!");
                                    }
                                }}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                            >
                                {previewSectionId + 1 < data.sections.length ? 'Selanjutnya' : 'Selesai'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}