import { useRef, useState } from "react";


export function useInspectionForm(sections: any[]) {

    const [targetJumpSectionId, setTargetJumpSectionId] = useState<number | null>(null);
    // cari index aktif
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    
    // pesan error untuk validasi
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const errorRef = useRef<HTMLDivElement>(null);

    // batas section terjauh yang sudah berhasil di selesaikan
    const [maxCompletedIndex, setMaxCompletedIndex] = useState(-1);

    // state untuk menampung jawaban
    const [answer, setAnswer] = useState<Record<number, any>>({});

    // Section dan pertanyaan yang sedang aktif
    const currentSection = sections[currentSectionIndex];
    const isFirstSection = currentSectionIndex === 0;
    const isLastSection = currentSectionIndex === sections.length - 1;

    // Kalkulasi progress bar
    const completedCount = maxCompletedIndex + 1;
    const progressPercentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

    // Handler untuk mengubah catatan / notes abnormality
    const handleNoteChange = (questionId: number, noteText: string) => {
        setAnswer(prev => ({
            ...prev,
            [questionId]: { ...getAnswer(questionId), note: noteText }
        }));
        if (noteText.trim() !== '') setErrorMessage(null);
    };

    // Helper untuk mengambil objek jawaban per pertanyaan secara aman
    const getAnswer = (questionId: number) => {
        return answer[questionId] || { value: '', photos: [], note: '' };
    };

    // Helper untuk menampilkan error dan otomatis menggeser layar ke atas
    const triggerError = (msg: string) => {
        setErrorMessage(msg);
        if (errorRef.current) {
            errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

// 2. Modifikasi handleValueChoice
const handleValueChoice = (questionId: number, val: any, selectedOption?: any) => {
    setAnswer(prev => ({
        ...prev,
        [questionId]: { ...getAnswer(questionId), value: val }
    }));
    setErrorMessage(null);

    // Jika opsi yang dipilih memiliki aturan jump section, catat sebagai intent (niat lompat)
    // tapi JANGAN langsung pindah section dulu!
    if (selectedOption && selectedOption.goto_form_section_id) {
        setTargetJumpSectionId(selectedOption.goto_form_section_id);
    } else {
        // Kalau user mengubah pilihan yang tidak ada jump logic-nya, reset target jump
        setTargetJumpSectionId(null);
    }
};

    // fungsi untuk mengecek section pertama
    const handlePrev = () => {
        if (!isFirstSection) {
            setCurrentSectionIndex(prev => prev - 1);
            setErrorMessage(null);
        }
    };

const handleAddPhoto = (questionId: number, e: React.ChangeEvent<HTMLInputElement>, questionItem: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Parse validation_rules dari pertanyaan terkait
    let rules: any = {};
    if (questionItem.validation_rules) {
        try {
            rules = typeof questionItem.validation_rules === 'string' 
                ? JSON.parse(questionItem.validation_rules) 
                : questionItem.validation_rules;
            
            // Jika disimpan sebagai array (misal format [{...}])
            if (Array.isArray(rules)) rules = rules[0] || {};
        } catch (e) {
            console.error("Gagal parsing validation rules", e);
        }
    }

    // 1. Cek Batasan Ukuran File (max_file_size)
    if (rules.max_file_size) {
        const maxBytes = parseFileSizeToBytes(rules.max_file_size);
        if (file.size > maxBytes) {
            triggerError(`File yang Anda kirim melebihi ukuran maksimal ${rules.max_file_size}.`);
            e.target.value = ''; // Reset input file
            return;
        }
    }

    // 2. Cek Format / Tipe File yang Diizinkan (allowed_file_type)
    if (rules.allowed_file_type && Array.isArray(rules.allowed_file_type) && rules.allowed_file_type.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        const isAllowed = rules.allowed_file_type.some((type: string) => {
            const cleanType = type.toLowerCase().trim();
            // Cocokkan berdasarkan kategori (IMAGE, PDF, dll) atau ekstensi file langsung
            if (cleanType === 'image' && file.type.startsWith('image/')) return true;
            if (cleanType === 'video' && file.type.startsWith('video/')) return true;
            if (cleanType === 'pdf' && (file.type === 'application/pdf' || fileExtension === 'pdf')) return true;
            if (cleanType === 'document' && (file.type.includes('word') || file.type.includes('sheet') || ['doc', 'docx', 'xls', 'xlsx', 'pdf'].includes(fileExtension || ''))) return true;
            
            return file.type.includes(cleanType) || cleanType === fileExtension;
        });

        if (!isAllowed) {
            triggerError(`Format file tidak sesuai. Format yang diizinkan: ${rules.allowed_file_type.join(', ')}.`);
            e.target.value = ''; // Reset input file
            return;
        }
    }

    // Jika lolos semua validasi file, simpan ke state answer
    setAnswer(prev => ({
        ...prev,
        [questionId]: { ...getAnswer(questionId), value: file }
    }));
    setErrorMessage(null);
};

    // Handler untuk menghapus file / foto
    const handleRemovePhoto = (questionId: number) => {
        setAnswer(prev => ({
            ...prev,
            [questionId]: { ...getAnswer(questionId), value: null }
        }));
    };

    // Helper converter ukuran file (misal "5MB" ke Bytes)
    const parseFileSizeToBytes = (sizeStr: string): number => {
        const unit = sizeStr.toUpperCase().replace(/[0-9]/g, '').trim();
        const num = parseFloat(sizeStr);
        if (unit === 'KB') return num * 1024;
        if (unit === 'MB') return num * 1024 * 1024;
        if (unit === 'GB') return num * 1024 * 1024 * 1024;
        return num; // Default bytes
    };

    

    const handleNext = () => {
        const questions = currentSection?.questions || [];

        // Validasi per pertanyaan di section aktif secara menyeluruh
        for (const q of questions) {
            const ans = getAnswer(q.id);

            // 1. Cek Pertanyaan Wajib Diisi (is_required)
            if (q.is_required && (!ans.value || (Array.isArray(ans.value) && ans.value.length === 0))) {
                triggerError(`Pertanyaan "${q.question_text}" wajib diisi.`);
                return;
            }

            // Parse validation_rules secara aman (mendukung format array maupun objek tunggal)
            let rules: any = {};
            if (q.validation_rules) {
                try {
                    let parsed = typeof q.validation_rules === 'string' 
                        ? JSON.parse(q.validation_rules) 
                        : q.validation_rules;
                    
                    rules = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
                } catch (e) {
                    console.error("Gagal parsing validation rules", e);
                }
            }

            // 2. Validasi Berdasarkan Tipe INPUT: TEXT / TEXTAREA (Expected Answer)
            if ((q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && ans.value) {
                if (rules.expected_answer && String(ans.value).trim() !== String(rules.expected_answer).trim()) {
                    // Ambil validation_error_message dari rules, atau gunakan pesan default
                    const customErrorMsg = rules.validation_error_message && rules.validation_error_message.trim() !== ''
                        ? rules.validation_error_message 
                        : `Jawaban untuk "${q.question_text}" tidak sesuai dengan standar.`;
                    
                    triggerError(customErrorMsg);
                    return;
                }
            }
        }

      setErrorMessage(null);
    if (currentSectionIndex > maxCompletedIndex) {
        setMaxCompletedIndex(currentSectionIndex);
    }

    // Cek apakah ada opsi yang dipilih di section ini yang memiliki 'goto_form_section_id'
        let targetJumpSectionId = null;
        for (const q of questions) {
            const ans = getAnswer(q.id);
            if (ans.value && q.options) {
                const selectedOpt = q.options.find((o: any) => o.id === ans.value);
                if (selectedOpt && selectedOpt.goto_form_section_id) {
                    targetJumpSectionId = selectedOpt.goto_form_section_id;
                    break; // Ambil instruksi lompat pertama yang ditemukan
                }
            }
        }

        // Jika ada target lompat, eksekusi pemindahan section (Gunakan Number() untuk amankan tipe data)
        if (targetJumpSectionId !== null) {
            const targetIndex = sections.findIndex(sec => Number(sec.id) === Number(targetJumpSectionId));
            if (targetIndex !== -1) {
                setCurrentSectionIndex(targetIndex);
                return;
            }
        }

    // Jika tidak ada aturan jump, lanjut ke section berikutnya secara normal
    if (!isLastSection) {
        setCurrentSectionIndex(prev => prev + 1);
    } else {
        alert('Semua section inspeksi selesai!');
    }
    };

    return {
        currentSectionIndex,
        setCurrentSectionIndex,
        errorMessage,
        errorRef,
        maxCompletedIndex,
        answer,
        currentSection,
        isFirstSection,
        isLastSection,
        completedCount,
        progressPercentage,
        handleNoteChange,
        getAnswer,
        handleValueChoice,
        handlePrev,
        handleAddPhoto,
        handleRemovePhoto,
        handleNext,
        triggerError
    }
}