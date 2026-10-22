import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlusCircle, Copy, Trash2, Layers, Image, Video, HelpCircle, ShieldCheck, SlidersHorizontal, CheckCircle2, AlertTriangle, FileText, Settings2 } from 'lucide-react';

interface Machine {
    machine_id: string;
    machine_name: string;
    machine_type?: string;
}

interface OptionItem {
    option_text: string;
    is_normal: boolean;
}

interface QuestionItem {
    question_text: string;
    question_image: string | null;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME';
    is_required: boolean;
    show_help_text: boolean;
    help_text: string;
    show_standard_text: boolean;
    standard_text: string;
    options: OptionItem[];
    enable_rules: boolean;
    require_evidence: boolean;
    allow_notes: boolean;
    auto_ticket: boolean;
}

interface SectionItem {
    section_title: string;
    section_description: string;
    questions: QuestionItem[];
}

interface Props {
    machines: Machine[];
}

export default function FormCreate({ machines }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        form_title: 'Formulir Pemantauan Tanpa Judul',
        machine_id: '',
        machine_type: '',
        description: '',
        frequency_type: 'DAILY',
        frequency_value: 1,
        day_of_week: 'MONDAY',
        day_of_month: 1,
        due_window_days: 1,
        start_date: '',
        sections: [
            {
                section_title: 'Bagian Utama',
                section_description: '',
                questions: [],
            },
        ] as SectionItem[],
    });

    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [activeFocus, setActiveFocus] = useState<string | number>('HEADER');

    const addSection = () => {
        const updatedSections = [
            ...data.sections,
            {
                section_title: `Bagian Tanpa Judul`,
                section_description: '',
                questions: [
                    {
                        question_text: '',
                        question_image: null,
                        input_type: 'TEXT',
                        is_required: true,
                        show_help_text: false,
                        help_text: '',
                        show_standard_text: false,
                        standard_text: '',
                        options: [{ option_text: 'Opsi 1', is_normal: true }, { option_text: 'Opsi 2', is_normal: false }],
                        enable_rules: false,
                        require_evidence: false,
                        allow_notes: true,
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
            input_type: 'TEXT',
            is_required: true,
            show_help_text: false,
            help_text: '',
            show_standard_text: false,
            standard_text: '',
            options: [{ option_text: 'Opsi 1', is_normal: true }, { option_text: 'Opsi 2', is_normal: false }],
            enable_rules: false,
            require_evidence: false,
            allow_notes: true,
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
        current.show_help_text = !current.show_help_text;
        if (!current.show_help_text) current.help_text = '';
        setData('sections', updatedSections);
    };

    const toggleStandardTextActive = () => {
        if (typeof activeFocus !== 'number') return;
        const sIndex = activeSectionIndex < data.sections.length ? activeSectionIndex : 0;
        const section = data.sections[sIndex];
        if (!section || activeFocus >= section.questions.length) return;

        const updatedSections = [...data.sections];
        const current = updatedSections[sIndex].questions[activeFocus];
        current.show_standard_text = !current.show_standard_text;
        if (!current.show_standard_text) current.standard_text = '';
        setData('sections', updatedSections);
    };

    const addOption = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        const options = updatedSections[sIndex].questions[qIndex].options;
        options.push({ option_text: `Opsi ${options.length + 1}`, is_normal: false });
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

    const renderToolbar = () => {
        const isQuestionActive = typeof activeFocus === 'number';
        return (
            <div className="absolute -right-14 top-6 hidden xl:flex flex-col bg-white border border-slate-200 shadow-lg rounded-xl p-1.5 gap-1.5 z-20">
                <button type="button" onClick={addQuestionToActiveSection} title="Tambah Pertanyaan" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><PlusCircle className="w-4 h-4" /></button>
                <button type="button" onClick={toggleHelpTextActive} title="Help Text" className={`p-2 rounded-lg transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}><HelpCircle className="w-4 h-4" /></button>
                <button type="button" onClick={toggleStandardTextActive} title="Standard Text" className={`p-2 rounded-lg transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}><ShieldCheck className="w-4 h-4" /></button>
                <button type="button" title="Gambar" className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Image className="w-4 h-4" /></button>
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
                <Link
                    href="/forms"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs w-fit"
                >
                    &larr; Kembali ke Daftar Form
                </Link>
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
                                            <input
                                                type="text"
                                                value={data.form_title}
                                                onChange={e => setData('form_title', e.target.value)}
                                                placeholder="Contoh: Checklist Harian Mesin Injeksi"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-bold bg-slate-50/50 transition-all text-slate-900"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi (Opsional)</label>
                                            <textarea
                                                value={data.description}
                                                onChange={e => setData('description', e.target.value)}
                                                placeholder="Petunjuk pengisian form untuk teknisi..."
                                                rows={2}
                                                className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-600 bg-slate-50/50 font-medium resize-none"
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
                                                        <option key={m.machine_id} value={m.machine_id}>{m.machine_type}</option>
                                                    ))}
                                                </select>
                                            </div>
                            

                                            <div className="grid grid-cols-3 gap-2 ">
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
                                                            onChange={e => setData('frequency_value', Number(e.target.value))}
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
                                        onChange={e => handleSectionChange(sIndex, 'section_description', e.target.value)}
                                        placeholder="Deskripsi bagian (opsional)"
                                        rows={2}
                                        className="w-full text-xs text-slate-600 border-b border-slate-100 hover:border-slate-300 focus:border-emerald-600 focus:outline-none pb-2 resize-none transition-colors bg-transparent"
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

                                        {/* Help Text Input (Opsional aktif) */}
                                        {q.show_help_text && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    value={q.help_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'help_text', e.target.value)}
                                                    placeholder="Tuliskan panduan atau help text untuk teknisi..."
                                                    className="w-full border border-sky-200 bg-sky-50/40 rounded-xl px-3.5 py-2 text-xs text-sky-900 outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'show_help_text', false)} className="text-slate-400 hover:text-rose-600 font-bold px-1.5">&times;</button>
                                            </div>
                                        )}

                                        {/* Standard Text Input (Opsional aktif) */}
                                        {q.show_standard_text && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    value={q.standard_text}
                                                    onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                    placeholder="Tuliskan nilai standar / acuan baku..."
                                                    className="w-full border border-emerald-200 bg-emerald-50/40 rounded-xl px-3.5 py-2 text-xs text-emerald-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                                />
                                                <button type="button" onClick={() => handleQuestionChange(sIndex, qIndex, 'show_standard_text', false)} className="text-slate-400 hover:text-rose-600 font-bold px-1.5">&times;</button>
                                            </div>
                                        )}

                                        {/* Opsi Pilihan Ganda / Checkbox / Dropdown + Status OK/NG */}
                                        {(q.input_type === 'SELECT' || q.input_type === 'CHECKBOX' || q.input_type === 'DROPDOWN') && (
                                            <div className="space-y-2.5 pt-2 bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-xs">
                                                <span className="block font-bold text-slate-600 uppercase tracking-wider text-[10px] mb-2">Konfigurasi Opsi & Status Normal:</span>
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="flex items-center gap-2.5">
                                                        <span className="text-slate-400 font-bold w-4">{oIndex + 1}.</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOptionChange(sIndex, qIndex, oIndex, 'is_normal', !opt.is_normal)}
                                                            title="Klik untuk mengubah status OK / NG"
                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1 shrink-0 ${
                                                                opt.is_normal 
                                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs' 
                                                                    : 'bg-rose-100 text-rose-800 border border-rose-200 shadow-xs'
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
                                                            className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800 outline-none focus:border-emerald-600 font-medium text-xs"
                                                        />

                                                        {q.options.length > 1 && (
                                                            <button type="button" onClick={() => removeOption(sIndex, qIndex, oIndex)} className="text-slate-400 hover:text-rose-600 font-bold px-2 py-1">&times;</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="pt-2 pl-6">
                                                    <button type="button" onClick={() => addOption(sIndex, qIndex)} className="text-emerald-700 font-extrabold hover:underline text-xs flex items-center gap-1">
                                                        <PlusCircle className="w-3.5 h-3.5" /> Tambah Opsi Pilihan
                                                    </button>
                                                </div>
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
        </AppLayout>
    );
}