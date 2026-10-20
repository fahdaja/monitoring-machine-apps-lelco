import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlusCircle, Copy, Trash2, Layers, Type, Image, Video, HelpCircle, ShieldCheck } from 'lucide-react';

interface Machine {
    machine_id: string;
    machine_name: string;
    machine_type?: string;
}

interface OptionItem {
    option_text: string;
}

interface QuestionItem {
    question_text: string;
    input_type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX' | 'DROPDOWN' | 'FILE' | 'DATE' | 'TIME' | 'NUMBER';
    unit: string;
    min_value: string;
    max_value: string;
    is_required: boolean;
    show_help_text: boolean;
    help_text: string;
    show_standard_text: boolean;
    standard_text: string;
    options: OptionItem[];
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
        description: '',
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

    // Fungsi menambah Section baru
    const addSection = () => {
        const updatedSections = [
            ...data.sections,
            {
                section_title: `Bagian Tanpa Judul`,
                section_description: '',
                questions: [
                    {
                        question_text: '',
                        input_type: 'TEXT',
                        unit: '',
                        min_value: '',
                        max_value: '',
                        is_required: true,
                        show_help_text: false,
                        help_text: '',
                        show_standard_text: false,
                        standard_text: '',
                        options: [{ option_text: 'Opsi 1' }, { option_text: 'Opsi 2' }],
                    }
                ],
            },
        ];
        setData('sections', updatedSections);
        setActiveSectionIndex(updatedSections.length - 1);
        setActiveFocus('SECTION_TITLE');
    };

    // Fungsi menambah pertanyaan ke section aktif
    const addQuestionToActiveSection = () => {
        const updatedSections = [...data.sections];
        const targetIndex = activeSectionIndex < updatedSections.length ? activeSectionIndex : 0;

        const newQuestion: QuestionItem = {
            question_text: '',
            input_type: 'TEXT',
            unit: '',
            min_value: '',
            max_value: '',
            is_required: true,
            show_help_text: false,
            help_text: '',
            show_standard_text: false,
            standard_text: '',
            options: [{ option_text: 'Opsi 1' }, { option_text: 'Opsi 2' }],
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

    // PERBAIKAN: Fungsi menghapus section dengan fallback terdekat
    const removeSection = (sIndex: number) => {
        if (data.sections.length <= 1) return;
        const updatedSections = data.sections.filter((_, i) => i !== sIndex);
        setData('sections', updatedSections);
        
        const prevIndex = Math.max(0, sIndex - 1);
        setActiveSectionIndex(prevIndex);
        // Jika kembali ke section 0, targetkan HEADER, jika section lain targetkan SECTION_TITLE
        setActiveFocus(prevIndex === 0 ? 'HEADER' : 'SECTION_TITLE');
    };

    // PERBAIKAN: Fungsi menghapus pertanyaan dengan fallback terdekat
    const removeQuestion = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions = updatedSections[sIndex].questions.filter((_, i) => i !== qIndex);
        setData('sections', updatedSections);
        
        const remainingQuestions = updatedSections[sIndex].questions.length;
        if (remainingQuestions === 0) {
            // Jika kosong, lompat ke judul bagian (header)
            setActiveFocus(sIndex === 0 ? 'HEADER' : 'SECTION_TITLE');
        } else {
            // Jika masih ada pertanyaan lain, pindah ke pertanyaan sebelumnya (atau ke-0 jika yg dihapus adalah no 0)
            setActiveFocus(Math.max(0, qIndex - 1));
        }
    };

    // Fungsi menduplikasi pertanyaan
    const duplicateQuestion = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        const target = updatedSections[sIndex].questions[qIndex];
        const duplicated = {
            ...target,
            options: target.options.map(opt => ({ ...opt })),
        };
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
        if (activeFocus >= section.questions.length) return;

        const updatedSections = [...data.sections];
        const current = updatedSections[sIndex].questions[activeFocus];
        current.show_help_text = !current.show_help_text;
        setData('sections', updatedSections);
    };

    const toggleStandardTextActive = () => {
        if (typeof activeFocus !== 'number') return;
        const sIndex = activeSectionIndex < data.sections.length ? activeSectionIndex : 0;
        const section = data.sections[sIndex];
        if (activeFocus >= section.questions.length) return;

        const updatedSections = [...data.sections];
        const current = updatedSections[sIndex].questions[activeFocus];
        current.show_standard_text = !current.show_standard_text;
        setData('sections', updatedSections);
    };

    const addOption = (sIndex: number, qIndex: number) => {
        const updatedSections = [...data.sections];
        const options = updatedSections[sIndex].questions[qIndex].options;
        options.push({ option_text: `Opsi ${options.length + 1}` });
        setData('sections', updatedSections);
    };

    const removeOption = (sIndex: number, qIndex: number, oIndex: number) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex].options = updatedSections[sIndex].questions[qIndex].options.filter((_, i) => i !== oIndex);
        setData('sections', updatedSections);
    };

    const handleOptionChange = (sIndex: number, qIndex: number, oIndex: number, value: string) => {
        const updatedSections = [...data.sections];
        updatedSections[sIndex].questions[qIndex].options[oIndex].option_text = value;
        setData('sections', updatedSections);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forms');
    };

    // Komponen Toolbar Dinamis
    const renderToolbar = () => {
        const isQuestionActive = typeof activeFocus === 'number';
        return (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-row bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 gap-2 sm:gap-3 xl:absolute xl:bottom-auto xl:left-auto xl:translate-x-0 xl:-right-16 xl:top-0 xl:flex-col xl:rounded-xl">
                <button type="button" onClick={addQuestionToActiveSection} title="Tambah Pertanyaan" className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><PlusCircle className="w-5 h-5" /></button>
                <button 
                    type="button" 
                    onClick={toggleHelpTextActive} 
                    title={isQuestionActive ? "Tambahkan Help Text" : "Pilih pertanyaan terlebih dahulu"} 
                    className={`p-2.5 rounded-xl transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}
                >
                    <HelpCircle className="w-5 h-5" />
                </button>
                <button 
                    type="button" 
                    onClick={toggleStandardTextActive} 
                    title={isQuestionActive ? "Tambahkan Standard Text" : "Pilih pertanyaan terlebih dahulu"} 
                    className={`p-2.5 rounded-xl transition-colors ${isQuestionActive ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`}
                >
                    <ShieldCheck className="w-5 h-5" />
                </button>
                <button type="button" title="Tambahkan Gambar" className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Image className="w-5 h-5" /></button>
                <button type="button" title="Tambahkan Video" className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Video className="w-5 h-5" /></button>
                <button type="button" onClick={addSection} title="Tambahkan Bagian / Section Baru" className="p-2.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><Layers className="w-5 h-5" /></button>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="Buat Template Form Pemantauan Mesin" />

            {/* Top Header Bar */}
            <div className="max-w-3xl mx-auto bg-white border-b border-slate-200 sticky top-0 z-30 mb-6 shadow-xs">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/forms"
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
                        >
                            &larr; Kembali
                        </Link>
                    </div>
                    <div className="flex items-center h-full">
                        <button
                            type="button"
                            className="relative px-4 h-full flex items-center justify-center text-xs font-black uppercase tracking-wider text-emerald-700 transition-colors group"
                        >
                            Pertanyaan
                            <span className="absolute bottom-0 left-0 w-full h-[3px] bg-emerald-600 rounded-t-full"></span>
                        </button>
                        <button
                            type="button"
                            className="relative px-4 h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors group"
                        >
                            Jawaban
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-6 pb-28 relative">
                
                <form onSubmit={submit} className="space-y-6">
                    
                    {/* PERULANGAN SECTION */}
                    {data.sections.map((section, sIndex) => (
                        <div 
                            key={sIndex} 
                            className={`space-y-4 p-4 rounded-2xl transition-all border-2 ${activeSectionIndex === sIndex ? 'border-emerald-400 bg-emerald-50/30' : 'border-transparent bg-transparent'}`}
                        >
                            {/* KARTU SECTION 1 (BAGIAN UTAMA) */}
                            {sIndex === 0 ? (
                                <div className="space-y-2 relative">
                                    <div className="inline-block bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-t-xl shadow-xs">
                                        Bagian 1 dari {data.sections.length}
                                    </div>

                                    {/* Kartu Header Utama Form */}
                                    <div 
                                        onMouseDownCapture={() => {
                                            if (activeSectionIndex !== sIndex || activeFocus !== 'HEADER') {
                                                setActiveSectionIndex(sIndex);
                                                setActiveFocus('HEADER');
                                            }
                                        }}
                                        onFocusCapture={() => {
                                            if (activeSectionIndex !== sIndex || activeFocus !== 'HEADER') {
                                                setActiveSectionIndex(sIndex);
                                                setActiveFocus('HEADER');
                                            }
                                        }}
                                        className={`bg-white rounded-2xl border shadow-sm border-t-8 transition-all relative cursor-pointer ${
                                            activeSectionIndex === sIndex && activeFocus === 'HEADER'
                                                ? 'border-emerald-600 border-t-emerald-600 ring-2 ring-emerald-100'
                                                : 'border-slate-200 border-t-emerald-600 hover:border-emerald-300'
                                        }`}
                                    >
                                        {activeSectionIndex === sIndex && activeFocus === 'HEADER' && renderToolbar()}

                                        <div className="p-6 sm:p-8 space-y-5">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={data.form_title}
                                                    onChange={e => setData('form_title', e.target.value)}
                                                    placeholder="Judul Formulir Pemantauan"
                                                    className="w-full text-2xl sm:text-3xl font-black text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none pb-1 transition-colors"
                                                />
                                                {errors.form_title && <span className="text-xs text-rose-600 font-bold mt-1 block">{errors.form_title}</span>}
                                            </div>

                                            <div>
                                                <textarea
                                                    value={data.description}
                                                    onChange={e => setData('description', e.target.value)}
                                                    placeholder="Deskripsi formulir (opsional)"
                                                    rows={2}
                                                    className="w-full text-xs sm:text-sm text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none pb-1 resize-none transition-colors"
                                                />
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                                                    Target Mesin Pemantauan <span className="text-rose-600">*</span>
                                                </label>
                                                <select
                                                    value={data.machine_id}
                                                    onChange={e => setData('machine_id', e.target.value)}
                                                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-semibold text-slate-800 shadow-xs transition-shadow"
                                                >
                                                    <option value="">-- Pilih Mesin Injeksi / Unit Terkait --</option>
                                                    {machines.map((m) => (
                                                        <option key={m.machine_id} value={m.machine_id}>
                                                            {m.machine_name} {m.machine_type ? `(${m.machine_type})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.machine_id && <span className="text-xs text-rose-600 font-bold mt-1.5 block">{errors.machine_id}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* KARTU SECTION BERIKUTNYA (SECTION 2, 3, dst.) */
                                <div className="space-y-2 relative">
                                    <div className="inline-block bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-t-xl shadow-xs">
                                        Bagian {sIndex + 1} dari {data.sections.length}
                                    </div>
                                    
                                    <div 
                                        onMouseDownCapture={() => {
                                            if (activeSectionIndex !== sIndex || activeFocus !== 'SECTION_TITLE') {
                                                setActiveSectionIndex(sIndex);
                                                setActiveFocus('SECTION_TITLE');
                                            }
                                        }}
                                        onFocusCapture={() => {
                                            if (activeSectionIndex !== sIndex || activeFocus !== 'SECTION_TITLE') {
                                                setActiveSectionIndex(sIndex);
                                                setActiveFocus('SECTION_TITLE');
                                            }
                                        }}
                                        className={`bg-white p-6 rounded-2xl border shadow-sm space-y-4 relative transition-all cursor-pointer ${
                                            activeSectionIndex === sIndex && activeFocus === 'SECTION_TITLE'
                                                ? 'border-emerald-600 ring-2 ring-emerald-100'
                                                : 'border-slate-200 hover:border-emerald-300'
                                        }`}
                                    >
                                        {activeSectionIndex === sIndex && activeFocus === 'SECTION_TITLE' && renderToolbar()}

                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <span className="text-xs font-bold text-slate-400">
                                                {activeSectionIndex === sIndex ? 'Sedang Diedit' : ''}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => removeSection(sIndex)}
                                                    title="Hapus Bagian Ini"
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={section.section_title}
                                                onChange={e => handleSectionChange(sIndex, 'section_title', e.target.value)}
                                                placeholder="Judul Bagian"
                                                className="w-full text-xl sm:text-2xl font-black bg-transparent border-b border-slate-200 focus:border-emerald-600 outline-none pb-1 text-slate-900 placeholder-slate-400 transition-colors"
                                            />
                                            <textarea
                                                value={section.section_description}
                                                onChange={e => handleSectionChange(sIndex, 'section_description', e.target.value)}
                                                placeholder="Deskripsi (opsional)"
                                                rows={2}
                                                className="w-full text-xs sm:text-sm bg-transparent border-b border-slate-200 focus:border-emerald-600 outline-none pb-1 resize-none text-slate-600 placeholder-slate-400 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DAFTAR PERTANYAAN DI DALAM SECTION */}
                            <div className="space-y-4 pl-0 sm:pl-4 relative">
                                {section.questions.length === 0 ? (
                                    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-xs relative">
                                        Belum ada pertanyaan di bagian ini. Gunakan tombol di samping untuk menambah pertanyaan.
                                    </div>
                                ) : (
                                    section.questions.map((q, qIndex) => (
                                        <div 
                                            key={qIndex} 
                                            onMouseDownCapture={() => {
                                                if (activeSectionIndex !== sIndex || activeFocus !== qIndex) {
                                                    setActiveSectionIndex(sIndex);
                                                    setActiveFocus(qIndex);
                                                }
                                            }}
                                            onFocusCapture={() => {
                                                if (activeSectionIndex !== sIndex || activeFocus !== qIndex) {
                                                    setActiveSectionIndex(sIndex);
                                                    setActiveFocus(qIndex);
                                                }
                                            }}
                                            className={`bg-white p-6 sm:p-7 rounded-2xl border shadow-sm space-y-5 relative border-l-4 transition-all cursor-pointer ${
                                                activeSectionIndex === sIndex && activeFocus === qIndex 
                                                    ? 'border-emerald-600 border-l-emerald-600 ring-2 ring-emerald-100' 
                                                    : 'border-slate-200 border-l-emerald-400 hover:border-emerald-300'
                                            }`}
                                        >
                                            {/* TOOLBAR MENEMPEL DI SETIAP PERTANYAAN YANG SEDANG AKTIF */}
                                            {activeSectionIndex === sIndex && activeFocus === qIndex && renderToolbar()}

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={q.question_text}
                                                        onChange={e => handleQuestionChange(sIndex, qIndex, 'question_text', e.target.value)}
                                                        placeholder={`Pertanyaan ${qIndex + 1}`}
                                                        className="w-full border-b border-slate-300 hover:border-slate-400 focus:border-emerald-600 pb-2 text-sm outline-none font-semibold text-slate-900 bg-slate-50/50 px-3 rounded-t-lg transition-colors"
                                                    />

                                                    {q.show_help_text && (
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <input
                                                                type="text"
                                                                value={q.help_text}
                                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'help_text', e.target.value)}
                                                                placeholder="Tuliskan petunjuk/help text untuk teknisi..."
                                                                className="w-full border border-sky-200 bg-sky-50/50 rounded-lg px-3 py-1.5 text-xs text-sky-900 outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuestionChange(sIndex, qIndex, 'show_help_text', false)}
                                                                className="text-slate-400 hover:text-rose-600 text-xs font-bold px-1.5"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    )}

                                                    {q.show_standard_text && (
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <input
                                                                type="text"
                                                                value={q.standard_text}
                                                                onChange={e => handleQuestionChange(sIndex, qIndex, 'standard_text', e.target.value)}
                                                                placeholder="Tuliskan nilai standar / acuan baku..."
                                                                className="w-full border border-emerald-200 bg-emerald-50/50 rounded-lg px-3 py-1.5 text-xs text-emerald-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuestionChange(sIndex, qIndex, 'show_standard_text', false)}
                                                                className="text-slate-400 hover:text-rose-600 text-xs font-bold px-1.5"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <select
                                                        value={q.input_type}
                                                        onChange={e => handleQuestionChange(sIndex, qIndex, 'input_type', e.target.value)}
                                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-bold text-slate-800 transition-shadow"
                                                    >
                                                        <option value="TEXT">Jawaban Singkat</option>
                                                        <option value="TEXTAREA">Paragraf</option>
                                                        <option value="SELECT">Pilihan Ganda</option>
                                                        <option value="CHECKBOX">Kotak Centang</option>
                                                        <option value="DROPDOWN">Drop-down</option>
                                                        <option value="NUMBER">Angka / Sensor</option>
                                                        <option value="FILE">Upload File</option>
                                                        <option value="DATE">Tanggal</option>
                                                        <option value="TIME">Waktu</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Render Input Dinamis */}
                                            <div>
                                                {q.input_type === 'TEXT' && (
                                                    <div className="py-2"><input type="text" disabled placeholder="Teks jawaban singkat" className="w-1/2 border-b border-dashed border-slate-300 bg-transparent text-xs text-slate-400 pb-1 outline-none" /></div>
                                                )}
                                                {q.input_type === 'TEXTAREA' && (
                                                    <div className="py-2"><textarea disabled placeholder="Teks jawaban panjang / paragraf" rows={2} className="w-full border-b border-dashed border-slate-300 bg-transparent text-xs text-slate-400 pb-1 outline-none resize-none" /></div>
                                                )}
                                                {q.input_type === 'SELECT' && (
                                                    <div className="space-y-3 pt-2">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded-full border border-slate-400 shrink-0"></div>
                                                                <input
                                                                    type="text"
                                                                    value={opt.option_text}
                                                                    onChange={e => handleOptionChange(sIndex, qIndex, oIndex, e.target.value)}
                                                                    className="flex-1 border-b border-transparent hover:border-slate-300 focus:border-emerald-600 text-xs py-1 outline-none transition-colors"
                                                                />
                                                                {q.options.length > 1 && (
                                                                    <button type="button" onClick={() => removeOption(sIndex, qIndex, oIndex)} className="text-slate-400 hover:text-rose-600 text-sm font-bold px-2">&times;</button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></div>
                                                            <button type="button" onClick={() => addOption(sIndex, qIndex)} className="text-xs font-bold text-emerald-600 hover:underline">+ Tambahkan opsi</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {q.input_type === 'CHECKBOX' && (
                                                    <div className="space-y-3 pt-2">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex items-center gap-3">
                                                                <div className="w-4 h-4 rounded border border-slate-400 shrink-0"></div>
                                                                <input
                                                                    type="text"
                                                                    value={opt.option_text}
                                                                    onChange={e => handleOptionChange(sIndex, qIndex, oIndex, e.target.value)}
                                                                    className="flex-1 border-b border-transparent hover:border-slate-300 focus:border-emerald-600 text-xs py-1 outline-none transition-colors"
                                                                />
                                                                {q.options.length > 1 && (
                                                                    <button type="button" onClick={() => removeOption(sIndex, qIndex, oIndex)} className="text-slate-400 hover:text-rose-600 text-sm font-bold px-2">&times;</button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <div className="w-4 h-4 rounded border border-slate-300 shrink-0"></div>
                                                            <button type="button" onClick={() => addOption(sIndex, qIndex)} className="text-xs font-bold text-emerald-600 hover:underline">+ Tambahkan opsi</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {q.input_type === 'NUMBER' && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Satuan Unit</label>
                                                            <input type="text" value={q.unit} onChange={e => handleQuestionChange(sIndex, qIndex, 'unit', e.target.value)} placeholder="°C / Bar" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Value</label>
                                                            <input type="number" value={q.min_value} onChange={e => handleQuestionChange(sIndex, qIndex, 'min_value', e.target.value)} placeholder="0" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white outline-none" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Value</label>
                                                            <input type="number" value={q.max_value} onChange={e => handleQuestionChange(sIndex, qIndex, 'max_value', e.target.value)} placeholder="100" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white outline-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                {q.input_type === 'FILE' && (
                                                    <div className="py-2"><div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-500 bg-slate-50">Simulasi Area Upload File / Foto</div></div>
                                                )}
                                                {['DATE', 'TIME'].includes(q.input_type) && (
                                                    <div className="py-2"><input type={q.input_type === 'DATE' ? 'date' : 'time'} disabled className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-500 bg-slate-50 outline-none" /></div>
                                                )}
                                            </div>

                                            {/* Footer Kartu Pertanyaan */}
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`req-${sIndex}-${qIndex}`}
                                                        checked={q.is_required}
                                                        onChange={e => handleQuestionChange(sIndex, qIndex, 'is_required', e.target.checked)}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <label htmlFor={`req-${sIndex}-${qIndex}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                                                        Wajib diisi
                                                    </label>
                                                </div>

                                                <div className="flex items-center gap-1 border-l pl-4 border-slate-200">
                                                    <button type="button" onClick={() => duplicateQuestion(sIndex, qIndex)} title="Duplikat" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => removeQuestion(sIndex, qIndex)} title="Hapus" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Tombol Tambah Pertanyaan Khusus di Section Ini */}
                                <div className="flex justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveSectionIndex(sIndex);
                                            addQuestionToActiveSection();
                                        }}
                                        className="bg-white border border-emerald-200 hover:border-emerald-400 text-emerald-700 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                                    >
                                        <PlusCircle className="w-4 h-4" /> Tambah Pertanyaan di Bagian Ini
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Tombol Simpan Akhir */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                        <Link
                            href="/forms"
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-7 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-md"
                        >
                            Simpan Template Form Pemantauan
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}