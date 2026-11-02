import React, { useState, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlusCircle, Copy, Trash2, Layers, Eye, Calendar, Image as ImageIcon, CornerDownRight, HelpCircle, ShieldCheck } from 'lucide-react';

interface ValidationRules {
    expected_answer?: string;
    validation_error_message?: string;
    allowed_file_type?: ('IMAGE' | 'VIDEO' | string)[];
    max_file_size?: '1MB' | '5MB' | '10MB' | string;
}

interface Machine {
    id: number;
    machine_name: string;
    machine_type?: string;
}

interface OptionItem {
    option_text: string;
    is_normal: boolean;
    option_order: number,
    goto_section_id?: string;
}

interface QuestionItem {
    question_text: string;
    question_image?: File | null;
    question_image_url?: string;
    question_file_url?: string;
    question_order: number,
    placeholder?: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    help_text?: string;
    standard_text?: string;
    is_required: boolean;
    validation_rules: ValidationRules,
    question_file?: File | null,
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
    machines: Machine[];
}

type ScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const formScheduleRules = (
    type: ScheduleType, 
    value: string[], 
    startDateStr: string, 
    endDateStr: string
) => {
    const scheduleDates: string[] = [];
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return scheduleDates;

    if (type === 'DAILY') {
        const curr = new Date(startDate);
        while (curr < endDate) {
            scheduleDates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
    } else if (type === 'WEEKLY') {
        const targetDays = value.map(Number).filter(n => !isNaN(n)); 
        const curr = new Date(startDate);
        while (curr < endDate) {
            if (targetDays.includes(curr.getDay())) {
                scheduleDates.push(curr.toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }
    } else if (type === 'MONTHLY') {
        const targetDates = value.map(Number).filter(n => !isNaN(n) && n > 0 && n <= 31);
        const curr = new Date(startDate);
        while (curr < endDate) {
            if (targetDates.includes(curr.getDate())) {
                scheduleDates.push(curr.toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }
    }
    return scheduleDates;
};

export default function FormCreate({ machines }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const [monthlyInputStr, setMonthlyInputStr] = useState('');

    const { data, setData, post, processing } = useForm({
        metadata: {
            form_id: '',
            form_title: 'Formulir Pemantauan Tanpa Judul',
            form_description: '',
            machine_id: '',
            machine_type: '',
            frequency_type: 'DAILY' as ScheduleType,
            start_date: '',
            end_date: '',
            due_window_days: '1',
            selected_custom_values: [] as string[],
        },
        sections: [
            {
                section_title: '',
                section_description: '',
                section_order: 0,
                questions: [],
            },
        ] as SectionItem[],
        questions: [] as QuestionItem[],
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const handleMetadataChange = (field: string, value: any) => {
        setData('metadata', { ...data.metadata, [field]: value });
    };

    const previewGeneratedDates = useMemo(() => {
        if (!data.metadata.start_date || !data.metadata.end_date) return [];
        return formScheduleRules(
            data.metadata.frequency_type,
            data.metadata.selected_custom_values,
            data.metadata.start_date,
            data.metadata.end_date
        );
    }, [data.metadata.frequency_type, data.metadata.selected_custom_values, data.metadata.start_date, data.metadata.end_date]);

    const handleValidationRuleChange = (sIndex: number, qIndex: number, ruleField: keyof ValidationRules, value: any) => {
        const updated = [...data.sections];
        updated[sIndex].questions[qIndex].validation_rules = {
            ...updated[sIndex].questions[qIndex].validation_rules,
            [ruleField]: value,
        };
        setData('sections', updated);
    };

    const FILE_SIZE_OPTIONS = ['1MB', '5MB', '10MB'];
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [activeFocus, setActiveFocus] = useState<string | number>('HEADER');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewSectionId, setPreviewSectionId] = useState<number>(0);
    const [previewHistory, setPreviewHistory] = useState<number[]>([]);
    const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

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
                        input_type: 'SELECT',
                        help_text: '',
                        standard_text: '',
                        is_required: false,
                        validation_rules: { validation_error_message: '', expected_answer: '', allowed_file_type: [], max_file_size: '' },
                        options: [
                            { option_text: 'Normal (OK)', is_normal: true, option_order: 1, goto_section_id: '' },
                            { option_text: 'Rusak (NG)', is_normal: false, option_order: 2, goto_section_id: '' }
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
        const targetIdx = activeSectionIndex < updated.length ? activeSectionIndex : 0;
        const newQ: QuestionItem = {
            question_text: '',
            question_order: updated[targetIdx].questions.length + 1,
            question_image_url: '',
            question_image: null,
            input_type: 'SELECT',
            help_text: '',
            standard_text: '',
            is_required: false,
            validation_rules: { expected_answer: '', validation_error_message: '', allowed_file_type: [], max_file_size: '' },
            options: [
                { option_text: 'Opsi 1', is_normal: true, option_order: 1, goto_section_id: '' },
                { option_text: 'Opsi 2', is_normal: false, option_order: 2, goto_section_id: '' }
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
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('File harus berupa gambar!');
                return;
            }
            const previewUrl = URL.createObjectURL(file);
            const updated = [...data.sections];
            updated[sIndex].questions[qIndex] = {
                ...updated[sIndex].questions[qIndex],
                question_image: file,
                question_image_url: previewUrl,
            };
            setData('sections', updated);
        }
    };

    const removeQuestionImage = (sIndex: number, qIndex: number) => {
        const updated = [...data.sections];
        updated[sIndex].questions[qIndex] = {
            ...updated[sIndex].questions[qIndex],
            question_image: null,
            question_image_url: '',
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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const generatedDates = formScheduleRules(
            data.metadata.frequency_type,
            data.metadata.selected_custom_values,
            data.metadata.start_date,
            data.metadata.end_date
        );
        post('/forms', { data: { ...data, schedule_dates: generatedDates } });
    };

    return (
        <AppLayout>
            <Head title="Buat Form Pemantauan" />

            <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Builder Form Pemantauan</h1>
                    <p className="text-xs text-slate-500">Rancang checklist inspeksi mesin dengan tampilan bersih.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { setPreviewSectionId(0); setPreviewHistory([]); setPreviewAnswers({}); setIsPreviewOpen(true); }}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                        <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <Link
                        href="/forms"
                        className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
                    >
                        Kembali
                    </Link>
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-4 pb-24">
                <form onSubmit={submit} className="space-y-4">
                    {data.sections.map((section, sIndex) => (
                        <div key={sIndex} className="space-y-3">
                            {sIndex === 0 ? (
                                <div 
                                    onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus('HEADER'); }}
                                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs border-t-4 border-t-emerald-600"
                                >
                                    <input
                                        type="text"
                                        value={data.metadata.form_title}
                                        onChange={e => handleMetadataChange('form_title', e.target.value)}
                                        placeholder="Judul Formulir"
                                        className="w-full text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 focus:border-emerald-600 focus:outline-none bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={data.metadata.form_description}
                                        onChange={e => handleMetadataChange('form_description', e.target.value)}
                                        placeholder="Deskripsi singkat formulir (opsional)"
                                        className="w-full text-xs text-slate-600 border-b border-slate-100 pb-2 focus:border-emerald-600 focus:outline-none bg-transparent"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Mesin *</label>
                                            <select
                                                value={data.metadata.machine_type}
                                                onChange={e => handleMetadataChange('machine_type', e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:border-emerald-600 outline-none font-medium"
                                            >
                                                <option value="">Pilih Mesin...</option>
                                                {machines.map(m => (
                                                    <option key={m.id} value={m.machine_type}>{m.machine_type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batas Tenggat (Hari)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={data.metadata.due_window_days}
                                                onChange={e => handleMetadataChange('due_window_days', e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:border-emerald-600 outline-none font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* KONFIGURASI PENJADWALAN LENGKAP */}
                                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Penjadwalan Tugas
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <select
                                                value={data.metadata.frequency_type}
                                                onChange={e => {
                                                    const val = e.target.value as ScheduleType;
                                                    setData('metadata', {
                                                        ...data.metadata,
                                                        frequency_type: val,
                                                        selected_custom_values: [],
                                                    });
                                                    setMonthlyInputStr('');
                                                }}
                                                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium outline-none"
                                            >
                                                <option value="DAILY">Harian</option>
                                                <option value="WEEKLY">Mingguan</option>
                                                <option value="MONTHLY">Bulanan</option>
                                            </select>
                                            <input
                                                type="date"
                                                min={today}
                                                value={data.metadata.start_date}
                                                onChange={e => handleMetadataChange('start_date', e.target.value)}
                                                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium outline-none"
                                            />
                                            <input
                                                type="date"
                                                min={data.metadata.start_date || today}
                                                value={data.metadata.end_date}
                                                onChange={e => handleMetadataChange('end_date', e.target.value)}
                                                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium outline-none"
                                            />
                                        </div>

                                        {data.metadata.frequency_type === 'WEEKLY' && (
                                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase">Pilih Hari dalam Seminggu:</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {[
                                                        { label: 'Minggu', val: '0' },
                                                        { label: 'Senin', val: '1' },
                                                        { label: 'Selasa', val: '2' },
                                                        { label: 'Rabu', val: '3' },
                                                        { label: 'Kamis', val: '4' },
                                                        { label: 'Jumat', val: '5' },
                                                        { label: 'Sabtu', val: '6' },
                                                    ].map(day => (
                                                        <label key={day.val} className={`px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer transition-all ${data.metadata.selected_custom_values.includes(day.val) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={data.metadata.selected_custom_values.includes(day.val)}
                                                                onChange={e => {
                                                                    const current = data.metadata.selected_custom_values;
                                                                    const updated = e.target.checked ? [...current, day.val] : current.filter(v => v !== day.val);
                                                                    handleMetadataChange('selected_custom_values', updated);
                                                                }}
                                                                className="hidden"
                                                            />
                                                            {day.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {data.metadata.frequency_type === 'MONTHLY' && (
                                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                                    Tanggal dalam Sebulan (Pisahkan koma, contoh: 1, 15, 30):
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="1, 15, 30"
                                                    value={monthlyInputStr}
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        setMonthlyInputStr(raw);
                                                        const vals = raw.split(',').map(s => s.trim()).filter(Boolean);
                                                        handleMetadataChange('selected_custom_values', vals);
                                                    }}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 bg-white font-medium text-xs text-slate-800 outline-none focus:border-emerald-600"
                                                />
                                            </div>
                                        )}

                                        <div className="text-[11px] text-slate-500 font-medium flex justify-between items-center pt-1 border-t border-slate-200/60">
                                            <span>Estimasi task terbuat:</span>
                                            <span className="font-bold text-emerald-700">{previewGeneratedDates.length} Task</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus('SECTION_TITLE'); }}
                                    className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs border-l-4 border-l-emerald-600"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-emerald-700 uppercase">Bagian {sIndex + 1}</span>
                                        <button type="button" onClick={() => removeSection(sIndex)} className="text-slate-400 hover:text-rose-600 text-xs">Hapus</button>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={section.section_title}
                                            onChange={e => handleSectionChange(sIndex, 'section_title', e.target.value)}
                                            placeholder="Judul Bagian"
                                            className="w-full text-base font-bold text-slate-800 border-b border-slate-100 pb-1.5 focus:border-emerald-600 outline-none bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={section.section_description || ''}
                                            onChange={e => handleSectionChange(sIndex, 'section_description', e.target.value)}
                                            placeholder="Deskripsi bagian (opsional)"
                                            className="w-full text-xs text-slate-500 border-b border-slate-100 pb-1.5 focus:border-emerald-600 outline-none bg-transparent"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Daftar Pertanyaan */}
                            <div className="space-y-3">
                                {section.questions.map((q, qIndex) => (
                                    <div
                                        key={qIndex}
                                        onMouseDownCapture={() => { setActiveSectionIndex(sIndex); setActiveFocus(qIndex); }}
                                        className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 transition-all hover:border-slate-300"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={q.question_text}
                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'question_text', e.target.value)}
                                                placeholder={`Pertanyaan ${qIndex + 1}`}
                                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50/50 outline-none focus:border-emerald-600"
                                            />
                                            
                                            {/* Tombol Upload Gambar Soal */}
                                            <input
                                                type="file"
                                                id={`q-img-${sIndex}-${qIndex}`}
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => handleQuestionImageUpload(sIndex, qIndex, e)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById(`q-img-${sIndex}-${qIndex}`)?.click()}
                                                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                                                title="Sisipkan Gambar"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                            </button>

                                            <select
                                                value={q.input_type}
                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'input_type', e.target.value)}
                                                className="w-32 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none"
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

                                        {/* FITUR BANTUAN: HELP TEXT & STANDARD TEXT */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleHelpText(sIndex, qIndex)}
                                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${q.help_text ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                <HelpCircle className="w-3 h-3" /> {q.help_text ? 'Help Text Aktif' : '+ Help Text'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleStandardText(sIndex, qIndex)}
                                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${q.standard_text ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                            >
                                                <ShieldCheck className="w-3 h-3" /> {q.standard_text ? 'Standard Text Aktif' : '+ Standard Text'}
                                            </button>
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
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'help_text', '')} className="text-slate-400 hover:text-rose-600 font-bold">&times;</button>
                                            </div>
                                        )}

                                        {q.standard_text !== undefined && q.standard_text !== '' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={q.standard_text.trim() === '' ? '' : q.standard_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                    placeholder="Tuliskan nilai standar / acuan baku..."
                                                    className="w-full border border-emerald-200 bg-emerald-50/40 rounded-lg px-3 py-1.5 text-xs text-emerald-900 outline-none"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'standard_text', '')} className="text-slate-400 hover:text-rose-600 font-bold">&times;</button>
                                            </div>
                                        )}

                                        {/* Preview Gambar Soal Tanpa Batasan Height/Width */}
                                        {q.question_image_url && (
                                            <div className="relative mt-2">
                                                <img 
                                                    src={q.question_image_url} 
                                                    alt="Preview Soal" 
                                                    className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50 object-contain" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestionImage(sIndex, qIndex)}
                                                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center transition-colors shadow-sm"
                                                    title="Hapus Gambar"
                                                >
                                                    &times;
                                                </button>
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

                                        {/* Opsi Pilihan Ganda dengan Fitur Goto Section */}
                                        {(['SELECT', 'CHECKBOX', 'DROPDOWN'] as string[]).includes(q.input_type) && (
                                            <div className="space-y-2 bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="text-slate-400 w-3">{oIndex + 1}.</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const opts = [...q.options];
                                                                    opts[oIndex].is_normal = !opts[oIndex].is_normal;
                                                                    handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                }}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${opt.is_normal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                                                            >
                                                                {opt.is_normal ? 'OK' : 'NG'}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt.option_text}
                                                                onChange={e => {
                                                                    const opts = [...q.options];
                                                                    opts[oIndex].option_text = e.target.value;
                                                                    handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                }}
                                                                className="flex-1 border border-slate-200 rounded px-2.5 py-1 text-xs outline-none bg-slate-50"
                                                            />
                                                        </div>

                                                        {/* Goto Section khusus SELECT */}
                                                        {q.input_type === 'SELECT' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <select
                                                                    value={opt.goto_section_id ?? ''}
                                                                    onChange={e => {
                                                                        const opts = [...q.options];
                                                                        opts[oIndex].goto_section_id = e.target.value;
                                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                                    }}
                                                                    className="border border-emerald-200 bg-emerald-50/40 rounded px-2 py-1 text-[11px] font-semibold text-emerald-900 outline-none"
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
                                                                className="text-slate-400 hover:text-rose-600 px-1.5 font-bold"
                                                            >
                                                                &times;
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const opts = [...q.options, { option_text: `Opsi ${q.options.length + 1}`, is_normal: false, option_order: q.options.length + 1, goto_section_id: '' }];
                                                        handleQuestionChange(sIndex, qIndex, 'options', opts);
                                                    }}
                                                    className="text-emerald-700 font-semibold text-xs hover:underline pt-1 inline-block"
                                                >
                                                    + Tambah Opsi
                                                </button>
                                            </div>
                                        )}

                                        {/* Validasi Minimalis */}
                                        {(q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && (
                                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                                                <span className="font-semibold text-[11px] text-slate-600">Validasi:</span>
                                                <input
                                                    type="text"
                                                    value={q.validation_rules?.expected_answer || ''}
                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'expected_answer', e.target.value)}
                                                    placeholder="Expected answer..."
                                                    className="flex-1 border-b border-slate-200 py-1 bg-transparent text-xs outline-none focus:border-emerald-600"
                                                />
                                                <input
                                                    type="text"
                                                    value={q.validation_rules?.validation_error_message || ''}
                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'validation_error_message', e.target.value)}
                                                    placeholder="Pesan error..."
                                                    className="flex-1 border-b border-slate-200 py-1 bg-transparent text-xs outline-none focus:border-emerald-600"
                                                />
                                            </div>
                                        )}

                                        {q.input_type === 'FILE' && (
                                            <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                                                <span className="font-semibold text-[11px] text-slate-600">Max Size File:</span>
                                                <select
                                                    value={q.validation_rules?.max_file_size || '10MB'}
                                                    onChange={e => handleValidationRuleChange(sIndex, qIndex, 'max_file_size', e.target.value)}
                                                    className="border border-slate-200 rounded px-2 py-1 bg-slate-50 text-xs font-semibold outline-none"
                                                >
                                                    {FILE_SIZE_OPTIONS.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={q.is_required}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'is_required', e.target.checked)}
                                                    className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                                                />
                                                Wajib Diisi
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => duplicateQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-emerald-600"><Copy className="w-3.5 h-3.5" /></button>
                                                <button type="button" onClick={() => removeQuestion(sIndex, qIndex)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={addQuestionToActiveSection}
                                        className="px-4 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Tambah Pertanyaan
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center justify-between pt-4">
                        <button
                            type="button"
                            onClick={addSection}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                            <Layers className="w-4 h-4" /> Tambah Bagian Baru
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                        >
                            Simpan Template Form
                        </button>
                    </div>
                </form>
            </div>

            {/* MODAL PREVIEW INTERAKTIF DENGAN GOTO SECTION SUPPORT */}
            {isPreviewOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Preview Mode Uji Coba (Bagian {previewSectionId + 1})</span>
                            <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white font-bold">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
                            {previewSectionId === 0 && (
                                <div className="bg-slate-900 text-white p-5 rounded-xl space-y-1">
                                    <h2 className="text-lg font-bold">{data.metadata.form_title || 'Formulir Pemantauan'}</h2>
                                    {data.metadata.form_description && <p className="text-xs text-slate-300">{data.metadata.form_description}</p>}
                                    <div className="pt-2 text-[11px] text-emerald-400 font-semibold">
                                        Target Mesin: {data.metadata.machine_type || 'Belum dipilih'} | Frekuensi: {data.metadata.frequency_type}
                                    </div>
                                </div>
                            )}

                            {previewSectionId > 0 && data.sections[previewSectionId]?.section_title && (
                                <div className="bg-emerald-900 text-white p-4 rounded-xl space-y-1">
                                    <h3 className="text-base font-bold">{data.sections[previewSectionId].section_title}</h3>
                                    {data.sections[previewSectionId].section_description && (
                                        <p className="text-xs text-emerald-200">{data.sections[previewSectionId].section_description}</p>
                                    )}
                                </div>
                            )}

                            {data.sections[previewSectionId]?.questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                                    <label className="text-xs font-bold text-slate-800 block">
                                        {qIndex + 1}. {q.question_text || 'Pertanyaan Tanpa Judul'} {q.is_required && <span className="text-rose-500">*</span>}
                                    </label>

                                    {/* Help Text Preview */}
                                    {q.help_text && q.help_text.trim() !== '' && (
                                        <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 p-2 rounded-lg">
                                            💡 <strong>Panduan:</strong> {q.help_text}
                                        </p>
                                    )}

                                    {/* Standard Text Preview */}
                                    {q.standard_text && q.standard_text.trim() !== '' && (
                                        <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                                            🛡️ <strong>Standar Acuan:</strong> {q.standard_text}
                                        </p>
                                    )}

                                    {/* Gambar Soal Preview Full Size */}
                                    {q.question_image_url && (
                                        <div className="pt-1">
                                            <img 
                                                src={q.question_image_url} 
                                                alt="Preview Soal" 
                                                className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50 object-contain" 
                                            />
                                        </div>
                                    )}

                                    {/* Jenis Input Aktif */}
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
                                            <span className="text-[10px] text-slate-400 block">Maksimal ukuran file: {q.validation_rules?.max_file_size || '10MB'}</span>
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
                                                            {opt.option_text} ({opt.is_normal ? 'OK' : 'NG'})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center justify-between text-xs text-slate-700 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300">
                                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                            <input 
                                                                type={q.input_type === 'CHECKBOX' ? 'checkbox' : 'radio'} 
                                                                name={`prev_${previewSectionId}_${qIndex}`} 
                                                                checked={previewAnswers[`q_${previewSectionId}_${qIndex}`] === opt.option_text}
                                                                onChange={() => {
                                                                    setPreviewAnswers(prev => ({ 
                                                                        ...prev, 
                                                                        [`q_${previewSectionId}_${qIndex}`]: opt.option_text,
                                                                        [`goto_${previewSectionId}_${qIndex}`]: opt.goto_section_id 
                                                                    }));
                                                                }}
                                                                className="text-emerald-600 rounded" 
                                                            /> 
                                                            <span className="font-medium text-slate-800">{opt.option_text}</span>
                                                        </label>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${opt.is_normal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                            {opt.is_normal ? 'OK' : 'NG'}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="bg-white px-5 py-3 border-t border-slate-200 flex justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    if (previewHistory.length > 0) {
                                        setPreviewSectionId(previewHistory[previewHistory.length - 1]);
                                        setPreviewHistory(prev => prev.slice(0, -1));
                                    }
                                }}
                                disabled={previewHistory.length === 0}
                                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors"
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Evaluasi apakah ada goto_section_id dari pertanyaan di section ini
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
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
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