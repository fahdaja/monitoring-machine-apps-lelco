import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlusCircle, Copy, Trash2, Layers, Image, Video, HelpCircle, ShieldCheck, SlidersHorizontal, CheckCircle2, AlertTriangle, FileText, Eye, ArrowRight, CornerDownRight, Upload } from 'lucide-react';

interface Machine {
    id: number;
    machine_name: string;
    machine_type?: string;
}

interface OptionItem {
    option_text: string;
    is_normal: boolean;
    goto_section_id?: string;
}

interface QuestionItem {
    question_text: string;
    question_image?: File | null;
    question_image_url?: string;
    placeholder?: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    help_text?: string;
    standard_text?: string;
    is_required: boolean;
    validation_rules: {
        expected_answer?: string;
        validation_error_message?: string;
        allowed_file_type?: ('IMAGE' | 'VIDEO' | string)[];
        max_file_size?: '1MB' | '5MB' | '10MB' | string;
        date_value?: string;
        time_value?: string;
    },
    options: OptionItem[];
    auto_ticket: boolean;
}

interface SectionItem {
    form_title?: string;
    form_description?: string;
    section_title?: string;
    section_description?: string;
    questions: QuestionItem[];
}

interface Props {
    machines: Machine[];
}

export default function FormCreate({ machines }: Props) {
    const { data, setData, post, processing } = useForm({
        form_title: 'Formulir Pemantauan Tanpa Judul',
        form_description: 'deskripsi optional',
        id: 0,
        machine_type: '',
        description: '',
        frequency_type: 'DAILY',
        frequency_value: [],
        day_of_week: 'MONDAY',
        day_of_month: 1,
        due_window_days: 1,
        start_date: '',
        end_date: '',
        sections: [
            {
                section_title: '',
                section_description: '',
                questions: [],
            },
        ] as SectionItem[],
        questions: [
            {
                question_text: '',
                question_image: null,
                question_image_url: '',
                placeholder: '',
                input_type: 'SELECT',
                help_text: '',
                standard_text: '',
                is_required: false,
                validation_rules: {
                    expected_answer: '',
                    validation_error_message: '',
                    allowed_file_type: ['IMAGE', 'VIDEO'],
                    max_file_size: '10MB',
                    date_value: '',
                    time_value: '',
                },
                options: [
                    { option_text: 'Opsi 1', is_normal: true, goto_section_id: '' },
                    { option_text: 'Opsi 2', is_normal: false, goto_section_id: '' }
                ] as OptionItem[],
                auto_ticket: false,
            },
        ] as QuestionItem[],
    });

    const daysOfWeek = [
        {
            label: 'Senin', value: 1,

        },
        {
            label: 'Selasa', value: 2,

        },
        {
            label: 'Rabu', value: 3,

        },
        {
            label: 'Kamis', value: 4,

        },
        {
            label: 'Jumat', value: 5,

        },
        {
            label: 'Sabtu', value: 6,

        },
        {
            label: 'Minggu', value: 7,

        }
    ]

    const upcomingSchedulesDates = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const dayOfMonth = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const scheduledDates = [];

        // perulangan untuk eksekusi harian
            for (let i = 0; i < data.due_window_days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() + i);
                scheduledDates.push(date.toISOString().split('T')[0]);
            }
        

        return scheduledDates;
    }

    const handleFrequencyTypeChange = (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
        if (type === 'DAILY') {
            setData('frequency_value', [1])
            setData('day_of_week', '')
            setData('day_of_month', 0)
            setData('due_window_days', 1)
        }
        if (type === 'WEEKLY') {
            setData('frequency_value',[])
            setData('day_of_week', '')
            setData('day_of_month', 0)
            setData('due_window_days', 0)
        }
        if (type === 'MONTHLY') {
            setData('frequency_value',[])
            setData('day_of_week', '')
            setData('day_of_month', 1)
            setData('day_of_week', 'MONDAY')
            setData('day_of_month', 0)
        }
    }


    const handleValidationRuleChange = (
        sIndex: number,
        qIndex: number,
        ruleField: keyof QuestionItem['validation_rules'],
        value: any
    ) => {
        const updatedSections = [...data.sections];
        const question = updatedSections[sIndex].questions[qIndex];

        question.validation_rules = {
            ...question.validation_rules,
            [ruleField]: value,
        };
        setData('sections', updatedSections);
    };

    const FILE_SIZE_OPTIONS = [
        '1MB',
        '5MB',
        '10MB',
    ];
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [activeFocus, setActiveFocus] = useState<string | number>('HEADER');

    // State untuk mode Preview
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSectionId, setPreviewSectionId] = useState<number>(0);
    const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({});
    const [previewHistory, setPreviewHistory] = useState<number[]>([]);

    const addSection = () => {
        const updatedSections = [
            ...data.sections,
            {
                section_title: `Bagian Tanpa Judul`,
                section_description: 'deskripsi bersifat (optional)',
                questions: [
                    {
                        question_text: '',
                        question_image: null,
                        question_image_url: '',
                        placeholder: '',
                        input_type: 'SELECT',
                        help_text: '',
                        standard_text: '',
                        is_required: false,
                        validation_rules: {
                            validation_error_message: '',
                            expected_answer: '',
                            allowed_file_type: [],
                            max_file_size: '',
                            date_value: '',
                            time_value: '',
                        },
                        options: [
                            { option_text: 'Normal (OK)', is_normal: true, goto_section_id: '' },
                            { option_text: 'Rusak / Perlu Servis (NG)', is_normal: true, goto_section_id: '' }
                        ],
                        auto_ticket: false,
                    }
                ],
            },
        ];
        setData('sections', updatedSections);
        setActiveSectionIndex(updatedSections.length - 1);
        setActiveFocus('SECTION_TITLE');
    };

    const addQuestionToActiveSection = () => {
        const updatedSections = [...data.sections];
        const targetIndex = activeSectionIndex < updatedSections.length ? activeSectionIndex : 0;

        const newQuestion: QuestionItem = {
            question_text: '',
            question_image: null,
            question_image_url: '',
            placeholder: '',
            input_type: 'SELECT',
            help_text: '',
            standard_text: '',
            is_required: false,
            validation_rules: {
                expected_answer: '',
                validation_error_message: '',
                allowed_file_type: [],
                max_file_size: '',
                date_value: '',
                time_value: '',
            },
            options: [
                { option_text: 'Opsi 1', is_normal: true, goto_section_id: '' },
                { option_text: 'Opsi 2', is_normal: false, goto_section_id: '' }
            ],
            auto_ticket: false,
        };

        if (typeof activeFocus === 'number' && activeFocus < updatedSections[targetIndex].questions.length) {
            updatedSections[targetIndex].questions.splice(activeFocus + 1, 0, newQuestion);
            setActiveFocus(activeFocus + 1);
        } else {
            updatedSections[targetIndex].questions.push(newQuestion);
            setActiveFocus(updatedSections[targetIndex].questions.length - 1);
        }

        setData('sections', updatedSections);
    };

    const removeSection = (sIndex: number) => {
        if (data.sections.length <= 1) return;
        const updatedSections = data.sections.filter((_, i) => i !== sIndex);
        setData('sections', updatedSections);
        const prevIndex = Math.max(0, sIndex - 1);
        setActiveSectionIndex(prevIndex);
        setActiveFocus(prevIndex === 0 ? 'HEADER' : 'SECTION_TITLE');
    };

    const removeQuestion = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions = updatedSections[sIndex].questions.filter((_, i) => i !== qIndex);
        setData('sections', updatedSections);
        const remainingQuestions = updatedSections[sIndex].questions.length;
        if (remainingQuestions === 0) {
            setActiveFocus(sIndex === 0 ? 'HEADER' : 'SECTION_TITLE');
        } else {
            setActiveFocus(Math.max(0, qIndex - 1));
        }
    };

    const duplicateQuestion = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        const target = updatedSections[sIndex].questions[qIndex];
        const duplicated = { ...target, options: target.options.map(opt => ({ ...opt })) };
        updatedSections[sIndex].questions.splice(qIndex + 1, 0, duplicated);
        setData('sections', updatedSections);
        setActiveFocus(qIndex + 1);
    };

    const handleQuestionChange = (sIndex: number, qIndex: number, field: keyof QuestionItem, value: any) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex] = {
            ...updatedSections[sIndex].questions[qIndex],
            [field]: value,
        };
        setData('sections', updatedSections);
    };

    const handleSectionChange = (sIndex: number, field: 'section_title' | 'section_description', value: string) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex][field] = value;
        setData('sections', updatedSections);
    };

    const toggleHelpTextActive = () => {
        if (typeof activeFocus !== 'number') return;
        const sIndex = activeSectionIndex < data.sections.length ? activeSectionIndex : 0;
        const section = data.sections[sIndex];
        if (!section || activeFocus >= section.questions.length) return;

        const updatedSections = [...data.sections];
        const current = updatedSections[sIndex].questions[activeFocus];
        // Jika belum ada/kosong, isi placeholder awal; jika sudah ada, kosongkan
        current.help_text = current.help_text ? '' : ' ';
        setData('sections', updatedSections);
    };

    const toggleStandardTextActive = () => {
        if (typeof activeFocus !== 'number') return;
        const sIndex = activeSectionIndex < data.sections.length ? activeSectionIndex : 0;
        const section = data.sections[sIndex];
        if (!section || activeFocus >= section.questions.length) return;

        const updatedSections = [...data.sections];
        const current = updatedSections[sIndex].questions[activeFocus];
        current.standard_text = current.standard_text ? '' : ' ';
        setData('sections', updatedSections);
    };

    const handleQuestionImageUpload = (sIndex: number, qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('File yang diunggah harus berupa gambar!');
                return;
            }
            const previewUrl = URL.createObjectURL(file);
            const updatedSections = [...data.sections];
            updatedSections[sIndex].questions[qIndex] = {
                ...updatedSections[sIndex].questions[qIndex],
                question_image: file,
                question_image_url: previewUrl,
            };
            setData('sections', updatedSections);
        }
    };

    const removeQuestionImage = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex] = {
            ...updatedSections[sIndex].questions[qIndex],
            question_image: null,
            question_image_url: '',
        };
        setData('sections', updatedSections);
    };

    const addOption = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        const options = updatedSections[sIndex].questions[qIndex].options;
        options.push({ option_text: `Opsi ${options.length + 1}`, is_normal: false, goto_section_id: '' });
        setData('sections', updatedSections);
    };

    const removeOption = (sIndex: number, qIndex: number, oIndex: number) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex].options = updatedSections[sIndex].questions[qIndex].options.filter((_, i) => i !== oIndex);
        setData('sections', updatedSections);
    };

    const handleOptionChange = (sIndex: number, qIndex: number, oIndex: number, field: keyof OptionItem, value: any) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex].options[oIndex] = {
            ...updatedSections[sIndex].questions[qIndex].options[oIndex],
            [field]: value
        };
        setData('sections', updatedSections);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forms');
    };

    const handlePreviewNext = () => {
        const currentSection = data.sections[previewSectionId];
        let targetIndex: number | null = null;

        if (currentSection) {
            for (const q of currentSection.questions) {
                if (q.input_type === 'SELECT') {
                    const selectedOptIndex = previewAnswers[q.question_text];
                    const selectedOpt = q.options[selectedOptIndex];
                    if (selectedOpt && selectedOpt.goto_section_id !== '' && selectedOpt.goto_section_id !== undefined) {
                        targetIndex = Number(selectedOpt.goto_section_id);
                        break;
                    }
                }
            }
        }

        if (targetIndex === null || isNaN(targetIndex)) {
            targetIndex = previewSectionId + 1;
        }

        if (targetIndex < data.sections.length) {
            setPreviewHistory(prev => [...prev, previewSectionId]);
            setPreviewSectionId(targetIndex);
        } else {
            alert("Pratinjau Selesai! Ini adalah akhir dari formulir.");
        }
    };

    const handlePreviewBack = () => {
        if (previewHistory.length > 0) {
            const lastSection = previewHistory[previewHistory.length - 1];
            setPreviewHistory(prev => prev.slice(0, -1));
            setPreviewSectionId(lastSection);
        }
    };

    const renderToolbar = () => {
        const isQuestionActive = typeof activeFocus === 'number';
        return (
            <div className="absolute -right-14 top-6 hidden xl:flex flex-col bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 gap-1.5 z-20">
                <button type="button" onClick={addQuestionToActiveSection} title="Tambah Pertanyaan" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><PlusCircle className="w-4 h-4" /></button>
                <button type="button" onClick={toggleHelpTextActive} title="Help Text" className={`p-2 rounded-lg transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}><HelpCircle className="w-4 h-4" /></button>
                <button type="button" onClick={toggleStandardTextActive} title="Standard Text" className={`p-2 rounded-lg transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}><ShieldCheck className="w-4 h-4" /></button>
                <button
                    type="button"
                    title="Sisipkan Gambar Soal"
                    onClick={() => {
                        if (isQuestionActive) {
                            const fileInput = document.getElementById(`question-img-upload-${activeSectionIndex}-${activeFocus}`) as HTMLInputElement;
                            fileInput?.click();
                        }
                    }}
                    className={`p-2 rounded-lg transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}
                >
                    <Image className="w-4 h-4" />
                </button>
                <button type="button" title="Video" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Video className="w-4 h-4" /></button>
                <button type="button" onClick={addSection} title="Bagian Baru" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Layers className="w-4 h-4" /></button>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="Buat Template Form Pemantauan Mesin" />

            {/* Header Navigasi Atas */}
            <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buat Form Pemantauan</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Rancang parameter checklist inspeksi dan validasi operasional mesin pabrik.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { setPreviewSectionId(0); setPreviewHistory([]); setPreviewAnswers({}); setIsPreviewOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                        <Eye className="w-4 h-4" /> Pratinjau Form & Alur (Preview)
                    </button>
                    <Link
                        href="/forms"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                        &larr; Kembali
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6 pb-28 relative">
                <form onSubmit={submit} className="space-y-6">
                    {data.sections.map((section, sIndex) => (
                        <div key={sIndex} className="space-y-4">
                            {sIndex === 0 ? (
                                /* KARTU HEADER UTAMA */
                                <div
                                    onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus('HEADER'); }}
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 relative border-t-8 border-t-emerald-600"
                                >
                                    {activeSectionIndex === sIndex && activeFocus === 'HEADER' && renderToolbar()}

                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                        <FileText className="w-4 h-4" /> Informasi Utama Formulir (Bagian 1 dari {data.sections.length})
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Formulir</label>
                                            <textarea
                                                value={data.form_title}
                                                onChange={e => { setData('form_title', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                placeholder="Contoh: Checklist Harian Mesin Injeksi"
                                                rows={1}
                                                className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 font-bold bg-slate-50/50 transition-all resize-none text-slate-900 overflow-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi (Opsional)</label>
                                            <textarea
                                                value={data.form_description}
                                                onChange={e => { setData('form_description', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                                placeholder="Petunjuk pengisian form untuk teknisi..."
                                                rows={1}
                                                className="w-full border-b border-slate-200 p-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium resize-none overflow-hidden"
                                            />
                                        </div>

                                        <div className="grid grid-rows-1 sm:grid-rows-2 gap-2 pt-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                                    Target Mesin <span className="text-rose-600">*</span>
                                                </label>
                                                <select
                                                    value={data.machine_type}
                                                    onChange={e => setData('machine_type', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-600 font-bold text-slate-800 bg-slate-50/50"
                                                >
                                                    <option value="">-- Pilih Mesin Terkait --</option>
                                                    {machines.map((m) => (
                                                        <option key={m.machine_type} value={m.machine_type}>{m.machine_type}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Frekuensi</label>
                                                    <div className="flex gap-1">
                                                        <select
                                                            value={data.frequency_type}
                                                            onChange={e => setData('frequency_type', e.target.value)}
                                                            className="border border-slate-200 rounded-xl px-2 py-2.5 bg-slate-50/50 font-medium text-xs w-full"
                                                        >
                                                            <option value="DAILY">Harian</option>
                                                            <option value="WEEKLY">Mingguan</option>
                                                            <option value="MONTHLY">Bulanan</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={data.frequency_value}
                                                            onChange={e => handleFrequencyChange(data.frequency_type, Number(e.target.value))}
                                                            className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 bg-slate-50/50 text-center font-bold text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Batas (Hari)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={data.due_window_days}
                                                        onChange={e => setData('due_window_days', Number(e.target.value))}
                                                        className="w-full border border-slate-200 rounded-xl px-2 py-2.5 bg-slate-50/50 text-center font-bold text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* KARTU HEADER SECTION LANJUTAN */
                                <div
                                    onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus('SECTION_TITLE'); }}
                                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4 relative border-l-8 border-l-emerald-600"
                                >
                                    {activeSectionIndex === sIndex && activeFocus === 'SECTION_TITLE' && renderToolbar()}

                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Bagian {sIndex + 1} dari {data.sections.length}</span>
                                        {data.sections.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSection(sIndex)}
                                                className="text-slate-400 hover:text-rose-600 text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Hapus Bagian
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="text"
                                        value={section.section_title}
                                        onChange={e => handleSectionChange(sIndex, 'section_title', e.target.value)}
                                        placeholder="Judul Bagian Baru"
                                        className="w-full text-lg font-bold text-slate-900 border-b border-slate-100 hover:border-slate-300 focus:border-emerald-600 focus:outline-none pb-2 transition-colors bg-transparent"
                                    />

                                    <textarea
                                        value={section.section_description}
                                        onChange={e => { handleSectionChange(sIndex, 'section_description', e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                        placeholder="Deskripsi bagian (opsional)"
                                        rows={1}
                                        className="w-full text-xs text-slate-600 border-b border-slate-100 hover:border-slate-300 focus:border-emerald-600 focus:outline-none pb-2 resize-none overflow-hidden transition-colors bg-transparent"
                                    />
                                </div>
                            )}

                            {/* DAFTAR PERTANYAAN DALAM SECTION */}
                            <div className="space-y-4">
                                {section.questions.map((q, qIndex) => (
                                    <div
                                        key={qIndex}
                                        onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus(qIndex); }}
                                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative border-l-4 border-l-emerald-600 transition-all hover:border-slate-300"
                                    >
                                        {activeSectionIndex === sIndex && activeFocus === qIndex && renderToolbar()}

                                        {/* Baris Pertanyaan & Tipe Input */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                            <input
                                                type="text"
                                                value={q.question_text}
                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'question_text', e.target.value)}
                                                placeholder={`Pertanyaan ${qIndex + 1}`}
                                                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-600 font-semibold text-slate-900 bg-slate-50/50 transition-all"
                                            />

                                            <select
                                                value={q.input_type}
                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'input_type', e.target.value)}
                                                className="w-full sm:w-48 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-bold text-slate-700"
                                            >
                                                <option value="TEXT">Jawaban Singkat</option>
                                                <option value="TEXTAREA">Paragraf</option>
                                                <option value="SELECT">Pilihan Ganda</option>
                                                <option value="CHECKBOX">Kotak Centang</option>
                                                <option value="DROPDOWN">Drop-down</option>
                                                <option value="FILE">Upload File</option>
                                                <option value="DATE">Tanggal</option>
                                                <option value="TIME">Waktu</option>
                                            </select>
                                        </div>


                                        {/* Help Text Input (Tampil jika help_text diisi / diaktifkan) */}
                                        {q.help_text !== undefined && q.help_text !== '' && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    value={q.help_text.trim() === '' ? '' : q.help_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'help_text', e.target.value)}
                                                    placeholder="Tuliskan panduan atau help text untuk teknisi..."
                                                    className="w-full border border-sky-200 bg-sky-50/40 rounded-xl px-3.5 py-2 text-xs text-sky-900 outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'help_text', '')} title="Hapus Panduan" className="text-slate-400 hover:text-rose-600 font-bold px-1.5 cursor-pointer">&times;</button>
                                            </div>
                                        )}

                                        {/* Standard Text Input (Tampil jika standard_text diisi / diaktifkan) */}
                                        {q.standard_text !== undefined && q.standard_text !== '' && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    value={q.standard_text.trim() === '' ? '' : q.standard_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                    placeholder="Tuliskan nilai standar / acuan baku..."
                                                    className="w-full border border-emerald-200 bg-emerald-50/40 rounded-xl px-3.5 py-2 text-xs text-emerald-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'standard_text', '')} title="Hapus Standar Acuan" className="text-slate-400 hover:text-rose-600 font-bold px-1.5 cursor-pointer">&times;</button>
                                            </div>
                                        )}

                                        {/* --- FITUR: SISIPKAN GAMBAR PADA PERTANYAAN --- */}
                                        <div className="">
                                            <input
                                                type="file"
                                                id={`question-img-upload-${sIndex}-${qIndex}`}
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleQuestionImageUpload(sIndex, qIndex, e)}
                                            />
                                            {q.question_image_url && (
                                                <div className="relative inline-block group">
                                                    <img
                                                        src={q.question_image_url}
                                                        alt="Ilustrasi Pertanyaan"
                                                        className="h-auto w-auto object-cover rounded-xl border border-slate-200 shadow-xs"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestionImage(sIndex, qIndex)}
                                                        className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center"
                                                        title="Hapus Gambar"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* khusus kolom jawaban singkat */}
                                        {(q.input_type === 'TEXT') && (
                                            <div>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <input
                                                        type="text"
                                                        value={q.placeholder}
                                                        onChange={e => handleQuestionChange(sIndex, qIndex, 'placeholder', e.target.value)}
                                                        placeholder="Teks jawaban singkat"
                                                        className="w-full border border-slate-200 bg-slate-50/40 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-slate-500 font-medium"
                                                        disabled
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {/* khusus kolom jawaban panjang */}
                                        {(q.input_type === 'TEXTAREA') && (
                                            <div>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <textarea
                                                        value={q.placeholder}
                                                        onChange={e => handleQuestionChange(sIndex, qIndex, 'placeholder', e.target.value)}
                                                        placeholder="Teks jawaban panjang"
                                                        className="w-full border border-slate-200 bg-slate-50/40 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-slate-500 font-medium resize-none"
                                                        disabled
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Konfigurasi Validasi Jawaban (KHUSUS TEXT & TEXTAREA) */}
                                        {(q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && (
                                            <div className="space-y-3 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={q.validation_rules?.expected_answer !== undefined && q.validation_rules?.expected_answer !== ''}
                                                            onChange={e => handleValidationRuleChange(sIndex, qIndex, 'expected_answer', e.target.checked ? ' ' : '')}
                                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                                        />
                                                        <span className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                                                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" /> Validasi Jawaban (Wajib Sama)
                                                        </span>
                                                    </label>
                                                </div>

                                                {q.validation_rules?.expected_answer !== undefined && q.validation_rules?.expected_answer !== '' && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-200/60">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                                    Jawaban yang Diinginkan
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={q.validation_rules?.expected_answer ?? ''}
                                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'expected_answer', e.target.value)}
                                                                    placeholder="Contoh: Normal / Sesuai / 6.5"
                                                                    className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                                                    Pesan Error Kustom (Jika Berbeda)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={q.validation_rules?.validation_error_message || ''}
                                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'validation_error_message', e.target.value)}
                                                                    placeholder="Contoh: Jawaban tidak sesuai standar acuan!"
                                                                    className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 shadow-2xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Konfigurasi Opsi & Jump Section (KHUSUS SELECT / DROPDOWN / CHECKBOX) */}
                                        {(q.input_type === 'SELECT' || q.input_type === 'DROPDOWN' || q.input_type === 'CHECKBOX') && (
                                            <div className="space-y-3 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="block font-bold text-slate-600 uppercase tracking-wider text-[10px]">Konfigurasi Opsi & Aturan Lompat (Jump Section):</span>
                                                </div>

                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="text-slate-400 font-bold w-4">{oIndex + 1}.</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOptionChange(sIndex, qIndex, oIndex, 'is_normal', !opt.is_normal)}
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1 shrink-0 ${opt.is_normal
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                                    }`}
                                                            >
                                                                {opt.is_normal ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                                {opt.is_normal ? 'OK' : 'NG'}
                                                            </button>

                                                            <input
                                                                type="text"
                                                                value={opt.option_text}
                                                                onChange={e => handleOptionChange(sIndex, qIndex, oIndex, 'option_text', e.target.value)}
                                                                placeholder={`Opsi ${oIndex + 1}`}
                                                                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 outline-none focus:border-emerald-600 font-medium text-xs"
                                                            />
                                                        </div>

                                                        {q.input_type === 'SELECT' && (
                                                            <div className="flex items-center gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold shrink-0">
                                                                    <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" /> Lompat ke:
                                                                </div>
                                                                <select
                                                                    value={opt.goto_section_id ?? ''}
                                                                    onChange={e => handleOptionChange(sIndex, qIndex, oIndex, 'goto_section_id', e.target.value)}
                                                                    className="border border-emerald-200 bg-emerald-50/40 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-600 w-full sm:w-40"
                                                                >
                                                                    <option value="">(Lanjut Default)</option>
                                                                    {data.sections.map((sec, targetIdx) => {
                                                                        if (targetIdx <= sIndex) return null;
                                                                        return (
                                                                            <option key={targetIdx} value={targetIdx}>
                                                                                Bagian {targetIdx + 1}: {sec.section_title || 'Tanpa Judul'}
                                                                            </option>
                                                                        )
                                                                    })}
                                                                </select>

                                                                {q.options.length > 1 && (
                                                                    <button type="button" onClick={() => removeOption(sIndex, qIndex, oIndex)} className="text-slate-400 hover:text-rose-600 font-bold px-2 py-1">&times;</button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                <div className="pt-1">
                                                    <button type="button" onClick={() => addOption(sIndex, qIndex)} className="text-emerald-700 font-extrabold hover:underline text-xs flex items-center gap-1">
                                                        <PlusCircle className="w-3.5 h-3.5" /> Tambah Opsi Pilihan
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* khusus untuk input tipe file */}
                                        {q.input_type === 'FILE' && (
                                            <div className="space-y-4 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-xs">
                                                <div>
                                                    <span className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2'>Pilih jenis file yang diizinkan diunggah</span>
                                                    <div className='flex items-center gap-4'>
                                                        <label className='flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer'>
                                                            <input
                                                                type="checkbox"
                                                                checked={q.validation_rules?.allowed_file_type?.includes('IMAGE')}
                                                                onChange={e => {
                                                                    const current = q.validation_rules?.allowed_file_type || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current.filter(t => t !== 'IMAGE'), 'IMAGE']
                                                                        : current.filter(t => t !== 'IMAGE');
                                                                    handleValidationRuleChange(sIndex, qIndex, 'allowed_file_type', updated);
                                                                }}
                                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                                            />
                                                            Gambar (Foto)
                                                        </label>
                                                        <label className='flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer'>
                                                            <input
                                                                type="checkbox"
                                                                checked={q.validation_rules?.allowed_file_type?.includes('VIDEO')}
                                                                onChange={e => {
                                                                    const current = q.validation_rules?.allowed_file_type || [];
                                                                    const updated = e.target.checked
                                                                        ? [...current.filter(t => t !== 'VIDEO'), 'VIDEO']
                                                                        : current.filter(t => t !== 'VIDEO');
                                                                    handleValidationRuleChange(sIndex, qIndex, 'allowed_file_type', updated);
                                                                }}
                                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                                            />
                                                            Video
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className='flex items-center gap-3 pt-2 border-t border-slate-200/60'>
                                                    <span className='text-xs font-bold text-slate-700 uppercase tracking-wider'>Ukuran file maksimal:</span>
                                                    <select
                                                        value={q.validation_rules?.max_file_size || '10MB'}
                                                        onChange={e => handleValidationRuleChange(sIndex, qIndex, 'max_file_size', e.target.value)}
                                                        className='border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs'
                                                    >
                                                        {FILE_SIZE_OPTIONS.map(size => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {q.input_type === 'DATE' && (
                                            <div className='flex items-center justify-between w-50 mt-5 mb-5 px-3 py-2 border-b border-slate-200 bg-slate-50/70 rounded-md select-none'>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {q.validation_rules?.date_value || 'Bulan, hari, tahun'}
                                                </span>
                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}

                                        {q.input_type === 'TIME' && (
                                            <div className='flex items-center justify-between w-50 mt-5 mb-5 px-3 py-2 border-b border-slate-200 bg-slate-50/70 rounded-md select-none'>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {q.validation_rules?.time_value || 'Waktu'}
                                                </span>
                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Footer Kartu Pertanyaan */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={q.is_required}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'is_required', e.target.checked)}
                                                    className="rounded border-slate-300 text-emerald-600 w-4 h-4"
                                                />
                                                Wajib Diisi (*Required*)
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                <button type="button" onClick={() => duplicateQuestion(sIndex, qIndex)} title="Duplikat Pertanyaan" className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                                                <button type="button" onClick={() => removeQuestion(sIndex, qIndex)} title="Hapus Pertanyaan" className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={addQuestionToActiveSection}
                                        className="bg-white border border-emerald-200 hover:border-emerald-300 text-emerald-700 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Tambah Pertanyaan Baru
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Tombol Simpan Form Utama */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                        <Link href="/forms" className="px-6 py-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-white transition-all shadow-xs">
                            Batal
                        </Link>
                        <button type="submit" disabled={processing} className="px-8 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-2">
                            Simpan Template Form Pemantauan
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL PRATINJAU FORM (PREVIEW & JUMP SECTION SIMULATOR) */}
            {isPreviewOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
                        {/* Header Modal */}
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">Preview Mode</span>
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
                        </div>

                        {/* Body Preview */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                            {previewSectionId === 0 && (
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-2.5 border-t-4 border-emerald-500">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2 flex-1 min-w-0">
                                            <h1 className="text-2xl font-black tracking-tight text-white break-words">
                                                {data.form_title || 'Formulir Pemantauan Tanpa Judul'}
                                            </h1>
                                            {data.form_description ? (
                                                <p className="text-xs text-slate-300 tracking-tight break-words font-medium leading-relaxed">
                                                    {data.form_description}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">
                                                    (Tidak ada deskripsi formulir)
                                                </p>
                                            )}
                                        </div>
                                        <div className="shrink-0">
                                            <span className="bg-emerald-600 rounded-full px-3 py-1 text-[10px] text-white font-bold uppercase tracking-wider shadow-xs inline-block">
                                                Frekuensi: {data.frequency_type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {data.sections[previewSectionId] && (previewSectionId > 0 || data.sections[previewSectionId].questions.length > 0) ? (
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                                    {previewSectionId > 0 && (
                                        <div className="border-b border-slate-100 pb-3">
                                            <h2 className="text-lg font-bold text-slate-900 mt-2 break-words tracking-tight leading-relaxed">{data.sections[previewSectionId].section_title}</h2>
                                            {data.sections[previewSectionId].section_description && (
                                                <p className="text-xs text-slate-500 mt-1 tracking-tight break-words leading-relaxed">{data.sections[previewSectionId].section_description}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* List Pertanyaan di Section Ini */}
                                    <div className="space-y-4">
                                        {data.sections[previewSectionId].questions.map((q, idx) => (
                                            <div key={idx} className="space-y-3 p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                                                <label className="block text-xs font-bold text-slate-800">
                                                    {idx + 1}. {q.question_text || '(Pertanyaan belum diisi)'}
                                                    {q.is_required && <span className="text-rose-600 ml-1">*</span>}
                                                </label>

                                                {/* --- PREVIEW GAMBAR SOAL JIKA ADA --- */}
                                                {q.question_image_url && (
                                                    <div>
                                                        <img
                                                            src={q.question_image_url}
                                                            alt="Ilustrasi Soal"
                                                            className="max-h-48 rounded-xl border border-slate-200 shadow-xs object-cover"
                                                        />
                                                    </div>
                                                )}

                                                {/* Render Input Jawaban Singkat (TEXT) */}
                                                {q.input_type === 'TEXT' && (
                                                    <input
                                                        type="text"
                                                        value={previewAnswers[q.placeholder] || ''}
                                                        onChange={e => setPreviewAnswers(prev => ({ ...prev, [q.placeholder || idx]: e.target.value }))}
                                                        placeholder={q.placeholder || "Ketik jawaban singkat..."}
                                                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs bg-white outline-none focus:border-emerald-600 font-medium text-slate-800"
                                                    />
                                                )}

                                                {/* Render Input Paragraf (TEXTAREA) */}
                                                {q.input_type === 'TEXTAREA' && (
                                                    <textarea
                                                        value={previewAnswers[q.placeholder] || ''}
                                                        onChange={e => setPreviewAnswers(prev => ({ ...prev, [q.placeholder || idx]: e.target.value }))}
                                                        placeholder={q.placeholder || "Ketik paragraf jawaban di sini..."}
                                                        rows={3}
                                                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-xs bg-white outline-none focus:border-emerald-600 font-medium resize-none text-slate-800"
                                                    />
                                                )}

                                                {/* Render Opsi Pilihan Ganda dengan Jump Section Indicator */}
                                                {(q.input_type === 'SELECT' || q.input_type === 'CHECKBOX' || q.input_type === 'DROPDOWN') && (
                                                    <div className="space-y-2 pt-1">
                                                        {q.options.map((opt, optIdx) => (
                                                            <label key={optIdx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-emerald-500 transition-all text-xs font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name={`preview_q_${idx}`}
                                                                        checked={previewAnswers[q.question_text] === optIdx}
                                                                        onChange={() => setPreviewAnswers(prev => ({ ...prev, [q.question_text]: optIdx }))}
                                                                        className="text-emerald-600 focus:ring-emerald-500"
                                                                    />
                                                                    <span className="text-slate-700">{opt.option_text}</span>
                                                                </div>
                                                                {opt.goto_section_id !== '' && opt.goto_section_id !== undefined && (
                                                                    <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                                                        ⚡ Lompat ke Bagian {Number(opt.goto_section_id) + 1}
                                                                    </span>
                                                                )}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {q.input_type === 'FILE' && (
                                                    <div className="grid grid-rows-1 w-auto mx-auto flex-wrap items-center gap-3 text-xs mt-2 justify-start">
                                                        <label className="inline-flex w-35 items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded cursor-pointer text-slate-700 font-medium transition-all shadow-2xs">
                                                            <Upload className="w-3.5 h-3.5" />
                                                            <span>Tambahkan file</span>
                                                            <input
                                                                type="file"
                                                                hidden
                                                                accept={[
                                                                    q.validation_rules.allowed_file_type?.includes('IMAGE') ? 'image/*' : '',
                                                                    q.validation_rules.allowed_file_type?.includes('VIDEO') ? 'video/*' : ''
                                                                ].filter(Boolean).join(',')}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const sizeInMb = parseInt(String(q.validation_rules.max_file_size || '10')) || 10;
                                                                        const maxBytes = sizeInMb * 1024 * 1024;

                                                                        if (file.size > maxBytes) {
                                                                            alert(`Ukuran file terlalu besar! Maksimal ${q.validation_rules.max_file_size || '10MB'}.`);
                                                                            e.target.value = '';
                                                                            return;
                                                                        }
                                                                        setPreviewAnswers(prev => ({ ...prev, [q.question_text]: file }));
                                                                    }
                                                                }}
                                                            />
                                                        </label>

                                                        {previewAnswers[q.question_text] && (
                                                            <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                {(previewAnswers[q.question_text] as File).name}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer Modal Preview */}
                        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handlePreviewBack}
                                disabled={previewHistory.length === 0}
                                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all"
                            >
                                &larr; Kembali
                            </button>
                            <button
                                type="button"
                                onClick={handlePreviewNext}
                                className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5"
                            >
                                Selanjutnya <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}