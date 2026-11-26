import React, { useEffect, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { compressQuestionImage } from '@/lib/compress-image';
import FormTaskPreviewModal from '@/components/forms/FormTaskPreviewModal';
import {
    PlusCircle, Copy, Trash2, Layers, Eye, Image as ImageIcon,
    CornerDownRight, HelpCircle, ShieldCheck, CheckCircle2, AlertCircle,
    GripVertical, ChevronDown, ChevronUp
} from 'lucide-react';

interface ValidationRules {
    expected_answer?: string;
    validation_error_message?: string;
    allowed_file_type?: string[];
    max_file_size?: '1MB' | '5MB' | '10MB' | string;
}

interface Machine {
    machine_id: number;
    machine_code: string
    machine_name: string;
    location: string;
}

interface OptionItem {
    option_text: string;
    is_normal: boolean;
    option_order: number;
    goto_form_section_id?: number | null;
}

interface QuestionItem {
    question_text: string;
    question_image?: File | null;
    question_image_url?: string;
    question_images?: File[];
    question_image_urls?: string[];
    question_file_url?: string;
    question_order: number;
    placeholder?: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    help_text?: string;
    standard_text?: string;
    is_required: boolean;
    validation_rules: ValidationRules[];
    question_file?: File | null;
    question_date?: string;
    question_time?: string;
    options: OptionItem[];
}

interface SectionItem {
    section_title?: string;
    section_description?: string | null;
    section_order?: number;
    questions: QuestionItem[];
}

interface Props {
    machines?: Machine[];
    defaultType?: string;
    defaultMachineId?: string | number | null;
}

interface ToastPayload {
    type: 'success' | 'error';
    title: string;
    description: string;
}

export default function FormCreate({ machines = [], defaultType = 'INSPECTION', defaultMachineId }: Props) {
    const { data, setData, post, processing } = useForm({
        metadata: {
            form_code: '',
            form_type: defaultType,
            form_title: 'Formulir Pemantauan Tanpa Judul',
            form_description: '',
            machine_id: defaultMachineId ? Number(defaultMachineId) : '' as string | number,
        },
        sections: [
            {
                section_title: ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'].includes(defaultType) ? 'Detail' : '',
                section_description: '',
                section_order: 1,
                questions: [
                    {
                        question_order: 1,
                        question_text: '',
                        question_image: null,
                        question_image_url: '',
                        input_type: 'SELECT' as const,
                        help_text: '',
                        standard_text: '',
                        is_required: false,
                        validation_rules: [{ validation_error_message: '', expected_answer: '', allowed_file_type: [], max_file_size: '' }],
                        options: [
                            { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: 0 || null },
                            { option_text: 'Opsi 2', is_normal: false, option_order: 2, goto_form_section_id: 0 || null }
                        ],
                    }
                ],
            },
        ] as SectionItem[],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const handleMetadataChange = (field: string, value: any) => {
        setData('metadata', { ...data.metadata, [field]: value });
    };

    // Form transisi (mulai repair / tutup tiket) berlaku untuk semua mesin
    const requiresMachine = ['INSPECTION', 'MANUAL_REPORT'].includes(data.metadata.form_type);

    // Keluarga "ticketing" (report/repair/close) = data entry murni: builder
    // menyembunyikan Standard Text, penanda normal/abnormal opsi & jump-logic.
    const isTicketing = ['MANUAL_REPORT', 'START_REPAIR', 'CLOSE_TICKET'].includes(data.metadata.form_type);

    const handleValidationRuleChange = (sIndex: number, qIndex: number, ruleField: keyof ValidationRules, value: any) => {
        const updated = [...data.sections];
        const currentRules = Array.isArray(updated[sIndex].questions[qIndex].validation_rules)
            ? [...updated[sIndex].questions[qIndex].validation_rules]
            : [{}];

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
    const [toastMessage, setToastMessage] = useState<ToastPayload | null>(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

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
                        question_image: null,
                        question_image_url: '',
                        question_file_url: '',
                        placeholder: '',
                        input_type: 'SELECT' as const,
                        help_text: '',
                        standard_text: '',
                        is_required: false,
                        validation_rules: [{ validation_error_message: '', expected_answer: '', allowed_file_type: [], max_file_size: '' }],
                        options: isTicketing
                            ? [
                                { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                                { option_text: 'Opsi 2', is_normal: true, option_order: 2, goto_form_section_id: null }
                            ]
                            : [
                                { option_text: 'Normal (OK)', is_normal: true, option_order: 1, goto_form_section_id: null },
                                { option_text: 'Rusak (NG)', is_normal: false, option_order: 2, goto_form_section_id: null }
                            ],
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
            question_image_url: '',
            question_image: null,
            input_type: 'SELECT',
            help_text: '',
            standard_text: '',
            is_required: false,
            validation_rules: [{ expected_answer: '', validation_error_message: '', allowed_file_type: [], max_file_size: '' }],
            options: isTicketing
                ? [
                    { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                    { option_text: 'Opsi 2', is_normal: true, option_order: 2, goto_form_section_id: null }
                ]
                : [
                    { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_form_section_id: null },
                    { option_text: 'Opsi 2', is_normal: false, option_order: 2, goto_form_section_id: null }
                ],
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

    const removeSection = (sIndex: number) => {
        if (data.sections.length <= 1) return;
        const updated = data.sections.filter((_, i) => i !== sIndex);
        setData('sections', updated);
        setActiveSectionIndex(Math.max(0, sIndex - 1));
        setActiveFocus('HEADER');
    };

    const removeQuestion = (sIndex: number, qIndex: number) => {
        const updated = [...data.sections];
        updated[sIndex].questions = updated[sIndex].questions.filter((_, i) => i !== qIndex);
        setData('sections', updated);
        setActiveFocus(Math.max(0, qIndex - 1));
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

    const [draggingQuestion, setDraggingQuestion] = useState<{ sIndex: number; qIndex: number } | null>(null);
    const [dragOverQuestion, setDragOverQuestion] = useState<{ sIndex: number; qIndex: number } | null>(null);
    const dragArmedRef = React.useRef(false);

    const [draggingSection, setDraggingSection] = useState<number | null>(null);
    const [dragOverSection, setDragOverSection] = useState<number | null>(null);
    const sectionDragArmedRef = React.useRef(false);

    const reorderSection = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= data.sections.length || toIndex >= data.sections.length) return;
        const nextSections = [...data.sections];
        const [moved] = nextSections.splice(fromIndex, 1);
        nextSections.splice(toIndex, 0, moved);
        setData(
            'sections',
            nextSections.map((sec, idx) => ({ ...sec, section_order: idx + 1 }))
        );
        setActiveSectionIndex(toIndex);
    };

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

    const handleQuestionImageUpload = async (sIndex: number, qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        const invalid = files.some((f) => !f.type.startsWith('image/'));
        if (invalid) {
            alert('Semua file yang dipilih harus berupa gambar!');
            return;
        }

        const compressedFiles = await Promise.all(
            files.map((f) => compressQuestionImage(f, 4.5, 1920).catch(() => f))
        );

        const updated = [...data.sections];
        const current = updated[sIndex].questions[qIndex];
        const nextFiles = [...(current.question_images || []), ...compressedFiles];
        const nextUrls = [...(current.question_image_urls || []), ...compressedFiles.map((f) => URL.createObjectURL(f))];

        updated[sIndex].questions[qIndex] = {
            ...current,
            question_images: nextFiles,
            question_image_urls: nextUrls,
        };
        setData('sections', updated);
    };

    const removeQuestionImage = (sIndex: number, qIndex: number, imgIndex: number) => {
        const updated = [...data.sections];
        const current = updated[sIndex].questions[qIndex];
        const nextFiles = (current.question_images || []).filter((_, i) => i !== imgIndex);
        const nextUrls = (current.question_image_urls || []).filter((_, i) => i !== imgIndex);

        updated[sIndex].questions[qIndex] = {
            ...current,
            question_images: nextFiles,
            question_image_urls: nextUrls,
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

    const isSectionInJumpRange = (targetSectionIndex: number) => {
        for (let i = 0; i < data.sections.length; i++) {
            if (i >= targetSectionIndex) break;
            const sec = data.sections[i];
            for (const q of sec.questions) {
                for (const opt of q.options || []) {
                    if (opt.goto_form_section_id !== null && opt.goto_form_section_id !== undefined) {
                        const jumpDest = Number(opt.goto_form_section_id);
                        if (targetSectionIndex > i && targetSectionIndex < jumpDest) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

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

                if (q.input_type === 'FILE') {
                    const fileRule = q.validation_rules?.[0] || {};
                    const allowedTypes = Array.isArray(fileRule.allowed_file_type) ? fileRule.allowed_file_type : [];
                    const maxSize = String(fileRule.max_file_size || '').trim();
                    if (allowedTypes.length === 0 || !maxSize) {
                        const msg = `Pertanyaan File ke-${qIndex + 1} (Bagian ${sIndex + 1}) wajib memilih minimal 1 format file yang diizinkan dan ukuran maksimal file!`;
                        setErrorMessage(msg);
                        setToastMessage({ type: 'error', title: 'Pengaturan File Belum Lengkap', description: msg });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                    }
                }

                if (['SELECT', 'CHECKBOX', 'DROPDOWN'].includes(q.input_type)) {
                    if (!q.options || q.options.length === 0) {
                        setErrorMessage(`Pertanyaan "${q.question_text}" harus memiliki minimal 1 opsi jawaban!`);
                        return;
                    }

                    for (let oIndex = 0; oIndex < q.options.length; oIndex++) {
                        if (!q.options[oIndex].option_text || q.options[oIndex].option_text.trim() === '') {
                            setErrorMessage(`Teks Opsi ke-${oIndex + 1} pada Pertanyaan ke-${qIndex + 1} (Bagian ${sIndex + 1}) masih kosong!`);
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
                    option_text: opt.option_text,
                    is_normal: opt.is_normal,
                    option_order: opt.option_order,
                    goto_form_section_id: opt.goto_form_section_id ? Number(opt.goto_form_section_id) : null
                }))
            }))
        }));
        setData('sections', preparedSections);

        post('/forms', {
            forceFormData: true,
            onSuccess: () => {
                setToastMessage({
                    type: 'success',
                    title: 'Berhasil Disimpan!',
                    description: 'Template form baru berhasil dibuat.'
                });
            },
            onError: (errors) => {
                console.error(errors);
                const firstError = (Object.values(errors ?? {}) as Array<string | string[]>)[0];
                const description = typeof firstError === 'string' ? firstError : firstError?.[0];
                setToastMessage({
                    type: 'error',
                    title: 'Gagal Menyimpan',
                    description: description || 'Periksa kembali inputan form yang belum lengkap.'
                });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Buat Template Form Pemantauan" />

            {/* TOAST — responsive */}
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

            {/* ERROR — responsive */}
            {errorMessage && (
                <div className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 sm:max-w-md bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-rose-700">
                    <span className="break-words">⚠️ {errorMessage}</span>
                </div>
            )}

            {/* HEADER HALAMAN — responsive */}
            <div className="max-w-3xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Builder Template Form</h1>
                    <p className="text-[11px] sm:text-xs text-slate-500">Rancang cetak biru (blueprint) pertanyaan inspeksi mesin.</p>
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
                {/* Metadata — padding responsive */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-2xs border-t-4 border-t-emerald-600">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {formTypeLabelMap[data.metadata.form_type] || data.metadata.form_type}
                        </span>
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
                        <div
                            key={sIndex}
                            draggable={!isTicketing}
                            onDragStart={e => {
                                if (!sectionDragArmedRef.current) {
                                    if (!dragArmedRef.current) e.preventDefault();
                                    return;
                                }
                                e.stopPropagation();
                                setDraggingSection(sIndex);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', `section:${sIndex}`);
                            }}
                            onDragOver={e => {
                                if (draggingSection !== null && draggingSection !== sIndex) {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dragOverSection !== sIndex) setDragOverSection(sIndex);
                                }
                            }}
                            onDrop={e => {
                                if (draggingSection !== null) {
                                    e.preventDefault();
                                    reorderSection(draggingSection, sIndex);
                                    setDraggingSection(null);
                                    setDragOverSection(null);
                                    sectionDragArmedRef.current = false;
                                }
                            }}
                            onDragEnd={() => {
                                setDraggingSection(null);
                                setDragOverSection(null);
                                sectionDragArmedRef.current = false;
                            }}
                            className={`bg-white rounded-xl border p-4 sm:p-5 space-y-4 shadow-2xs border-l-4 border-l-emerald-600 transition-all ${
                                draggingSection === sIndex
                                    ? 'opacity-50 border-dashed border-emerald-400'
                                    : dragOverSection === sIndex
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/10'
                                    : 'border-slate-200'
                            }`}
                        >
                            {!isTicketing && (
                            <>
                            {/* Header Section */}
                            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    {data.sections.length > 1 && (
                                        <span
                                            onMouseDown={() => { sectionDragArmedRef.current = true; }}
                                            onMouseUp={() => { sectionDragArmedRef.current = false; }}
                                            className="p-1 -ml-1 text-slate-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing shrink-0 select-none inline-flex items-center"
                                            title="Tarik untuk mengubah urutan bagian"
                                        >
                                            <GripVertical className="w-4 h-4 pointer-events-none" />
                                        </span>
                                    )}
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

                            {/* Daftar Pertanyaan */}
                            {!collapsedSections[sIndex] && (
                            <div className="space-y-3">
                                {section.questions.map((q, qIndex) => {
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
                                        {/* Baris pertanyaan — responsive */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="flex items-center gap-2 w-full sm:flex-1 min-w-0">
                                                <span
                                                    onMouseDown={() => { dragArmedRef.current = true; }}
                                                    onMouseUp={() => { dragArmedRef.current = false; }}
                                                    className="p-1 text-slate-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing shrink-0 select-none inline-flex items-center"
                                                    title="Tarik untuk mengubah urutan pertanyaan"
                                                >
                                                    <GripVertical className="w-4 h-4 pointer-events-none" />
                                                </span>
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

                                        {/* Toggle Help / Standard */}
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

                                        {q.help_text !== undefined && q.help_text !== '' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={q.help_text.trim() === '' ? '' : q.help_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'help_text', e.target.value)}
                                                    placeholder="Tuliskan panduan / help text..."
                                                    className="w-full border border-sky-200 bg-sky-50/40 rounded-lg px-3 py-1.5 text-xs text-sky-900 outline-none"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'help_text', '')} className="text-slate-400 hover:text-rose-600 font-bold shrink-0">&times;</button>
                                            </div>
                                        )}

                                        {!isTicketing && q.standard_text !== undefined && q.standard_text !== '' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={q.standard_text.trim() === '' ? '' : q.standard_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                    placeholder="Tuliskan nilai standar / acuan baku..."
                                                    className="w-full border border-emerald-200 bg-emerald-50/40 rounded-lg px-3 py-1.5 text-xs text-emerald-900 outline-none"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'standard_text', '')} className="text-slate-400 hover:text-rose-600 font-bold shrink-0">&times;</button>
                                            </div>
                                        )}

                                        {(q.question_image_urls && q.question_image_urls.length > 0) && (
                                            <div className={`mt-2 ${q.question_image_urls.length === 1 ? 'w-full' : 'flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2'}`}>
                                                {q.question_image_urls.map((imgUrl, imgIdx) => (
                                                    <div key={imgIdx} className={`relative ${q.question_image_urls!.length === 1 ? 'w-full' : 'shrink-0 w-[82%] sm:w-64 snap-start'}`}>
                                                        <img
                                                            src={imgUrl}
                                                            alt={`Preview Soal ${imgIdx + 1}`}
                                                            className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 object-contain"
                                                        />
                                                        {q.question_image_urls!.length > 1 && (
                                                            <span className="absolute top-1.5 left-1.5 bg-slate-900/75 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                {imgIdx + 1}/{q.question_image_urls!.length}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuestionImage(sIndex, qIndex, imgIdx)}
                                                            className="absolute top-1.5 right-1.5 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                                                            title="Hapus Gambar"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

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
                                                        </div>

                                                        {!isTicketing && q.input_type === 'SELECT' && (
                                                            <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto sm:max-w-[240px]">
                                                                <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <select
                                                                    value={opt.goto_form_section_id ?? ''}
                                                                    onChange={e => {
                                                                        const opts = [...q.options];
                                                                        opts[oIndex].goto_form_section_id = e.target.value ? Number(e.target.value) : null;
                                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                    }}
                                                                    className="flex-1 min-w-0 w-full max-w-full truncate border border-emerald-200 bg-emerald-50/40 rounded px-2 py-1 text-[11px] font-semibold text-emerald-900 outline-none"
                                                                >
                                                                    <option value="">Lanjut Default</option>
                                                                    {data.sections.map((sec, targetIdx) => {
                                                                        if (targetIdx <= sIndex) return null;
                                                                        return (
                                                                            <option key={targetIdx} value={targetIdx}>
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
                                                                onClick={() => {
                                                                    const opts = q.options.filter((_, i) => i !== oIndex);
                                                                    handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                }}
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

                                        {(q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && (
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-xs text-slate-500 pt-1">
                                                <span className="font-semibold text-[11px] text-slate-600 shrink-0">Validasi:</span>
                                                <select
                                                    value={q.validation_rules?.[0]?.expected_answer || ''}
                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'expected_answer', e.target.value)}
                                                    className="sm:w-48 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium text-slate-700 outline-none focus:border-emerald-600"
                                                >
                                                    <option value="">Tanpa Validasi (Bebas)</option>
                                                    <option value="angka">Harus Angka</option>
                                                    <option value="huruf">Harus Huruf / Teks</option>
                                                </select>
                                                {q.validation_rules?.[0]?.expected_answer && (
                                                    <input
                                                        type="text"
                                                        value={q.validation_rules?.[0]?.validation_error_message || ''}
                                                        onChange={e => handleValidationRuleChange(sIndex, qIndex, 'validation_error_message', e.target.value)}
                                                        placeholder="Pesan error kustom (opsional)..."
                                                        className="flex-1 border-b border-slate-200 py-1 bg-transparent text-xs outline-none focus:border-emerald-600"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {q.input_type === 'FILE' && (
                                            <div className="space-y-2 bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-200 text-xs">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                    <div>
                                                        <span className="font-semibold text-slate-700 block mb-1">Tipe File yang Diperbolehkan:</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['jpg', 'jpeg', 'png', 'webp'].map(type => {
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
                                                            value={q.validation_rules?.[0]?.max_file_size || ''}
                                                            onChange={e => handleValidationRuleChange(sIndex, qIndex, 'max_file_size', e.target.value)}
                                                            className="border border-slate-200 rounded px-2 py-1 bg-white text-xs font-semibold outline-none"
                                                        >
                                                            <option value="">-- Pilih Ukuran --</option>
                                                            {FILE_SIZE_OPTIONS.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const isFirstSection = sIndex === 0;
                                            const hasThisQuestionJump = q.options?.some(o => o.goto_form_section_id !== null && o.goto_form_section_id !== undefined);
                                            const isInRange = isSectionInJumpRange(sIndex);
                                            const shouldHideRequired = !isFirstSection && (hasThisQuestionJump || isInRange);

                                            return (
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        {!shouldHideRequired && (
                                                            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={q.is_required}
                                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'is_required', e.target.checked)}
                                                                    className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                                                                />
                                                                Wajib Diisi
                                                            </label>
                                                        )}
                                                        {qIndex > 0 && !['SELECT', 'DROPDOWN', 'CHECKBOX'].includes(q.input_type) && (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <label className="flex items-center gap-1.5 font-semibold text-rose-700 cursor-pointer" title="Pertanyaan ini hanya tampil jika pertanyaan pemicu dijawab Abnormal (is_normal = false)">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean((q.validation_rules?.[0] as any)?.show_on_abnormal)}
                                                                        onChange={e => {
                                                                            const currentRule = (q.validation_rules?.[0] || {}) as any;
                                                                            handleQuestionChange(sIndex, qIndex, 'validation_rules', [{ ...currentRule, show_on_abnormal: e.target.checked }]);
                                                                        }}
                                                                        className="rounded border-rose-300 text-rose-600 w-3.5 h-3.5"
                                                                    />
                                                                    Hanya Muncul Jika Abnormal
                                                                </label>
                                                                {Boolean((q.validation_rules?.[0] as any)?.show_on_abnormal) && (
                                                                    <select
                                                                        value={(q.validation_rules?.[0] as any)?.trigger_question_code || ''}
                                                                        onChange={e => {
                                                                            const currentRule = (q.validation_rules?.[0] || {}) as any;
                                                                            handleQuestionChange(sIndex, qIndex, 'validation_rules', [{ ...currentRule, trigger_question_code: e.target.value || null }]);
                                                                        }}
                                                                        className="rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px] font-semibold text-rose-800 max-w-[220px] truncate focus:outline-none focus:border-rose-400"
                                                                    >
                                                                        <option value="">Pemicu: Otomatis (terdekat di atas)</option>
                                                                        {sec.questions.slice(0, qIndex).map((prevQ, prevIdx) =>
                                                                            ['SELECT', 'DROPDOWN', 'CHECKBOX'].includes(prevQ.input_type) ? (
                                                                                <option key={prevQ.question_code || `order:${prevIdx + 1}`} value={prevQ.question_code || `order:${prevIdx + 1}`}>
                                                                                    Pemicu: #{prevIdx + 1} {prevQ.question_text || 'Pertanyaan'}
                                                                                </option>
                                                                            ) : null
                                                                        )}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button type="button" onClick={() => duplicateQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-emerald-600 cursor-pointer" title="Duplikat"><Copy className="w-3.5 h-3.5" /></button>
                                                        <button type="button" onClick={() => removeQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
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
                                {processing ? 'Menyimpan...' : 'Simpan Template Form'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* MODAL PREVIEW — identik dengan tasks/show */}
            <FormTaskPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                formTitle={data.metadata.form_title}
                formDescription={data.metadata.form_description}
                formType={data.metadata.form_type}
                sections={data.sections.map((sec) => ({
                    section_title: sec.section_title,
                    section_description: sec.section_description,
                    questions: sec.questions.map((q) => ({
                        question_text: q.question_text,
                        input_type: q.input_type,
                        help_text: q.help_text,
                        standard_text: q.standard_text,
                        is_required: q.is_required,
                        validation_rules: q.validation_rules,
                        options: q.options,
                        previewImages: (q.question_image_urls || []),
                    })),
                }))}
            />
        </AppLayout>
    );
}
