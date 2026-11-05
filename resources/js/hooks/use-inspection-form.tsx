import axios from "axios";
import { useEffect, useRef, useState } from "react";


export function useInspectionForm(sections: any[], initialAnswers: Record<number, any> = {}) {

    // 
    const storageKey = `inspection_answers_${window.location.pathname}`;

    const parseAnswersData = (rawData: any) => {
        let mapped: Record<number, any> = {};

        // Jika bentuknya sudah key-value map standar (misal: { 1: {value: ...} })
        if (rawData && !rawData.sections && !Array.isArray(rawData) && Object.keys(rawData).length > 0) {
            // Cek apakah key-nya berupa ID angka pertanyaan
            const firstKey = Object.keys(rawData)[0];
            if (!isNaN(Number(firstKey))) {
                return rawData;
            }
        }

        // Jika bentuknya snapshot enterprise (memiliki key 'sections')
        const sectionsList = rawData?.sections || (Array.isArray(rawData) ? rawData : []);
        if (sectionsList.length > 0) {
            sectionsList.forEach((sec: any) => {
                if (sec.questions && Array.isArray(sec.questions)) {
                    sec.questions.forEach((q: any) => {
                        const qId = q.form_question_id || q.id;
                        const detail = q.answer_detail || { value: '', note: '', photos: '' };
                        if (qId) {
                            mapped[qId] = {
                                value: detail.value ?? '',
                                note: detail.note ?? '',
                                photos: detail.photos ?? ''
                            };
                        }
                    });
                }
            });
        }
        return mapped;
    };

    const [targetJumpSectionId, setTargetJumpSectionId] = useState<number | null>(null);
    // cari index aktif
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    
    // pesan error untuk validasi
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const errorRef = useRef<HTMLDivElement>(null);

    // batas section terjauh yang sudah berhasil di selesaikan
    const [maxCompletedIndex, setMaxCompletedIndex] = useState(-1);

    // state untuk menampung jawaban

   const [answers, setAnswers] = useState<Record<number, any>>(() => {
        try {
            const savedLocal = localStorage.getItem(storageKey);
            if (savedLocal) {
                const parsedLocal = JSON.parse(savedLocal);
                const converted = parseAnswersData(parsedLocal);
                if (Object.keys(converted).length > 0) {
                    return converted; // Berhasil merestore dari LocalStorage!
                }
            }
        } catch (e) {
            console.error("Gagal membaca LocalStorage:", e);
        }

        // Fallback ke initialAnswers dari database jika local kosong
        return parseAnswersData(initialAnswers);
    });

    // Sinkronkan ke LocalStorage setiap kali answers berubah
    useEffect(() => {
        try {
            if (answers && Object.keys(answers).length > 0) {
                localStorage.setItem(storageKey, JSON.stringify(answers));
            }
        } catch (e) {
            console.error("Gagal menyimpan ke LocalStorage:", e);
        }
    }, [answers, storageKey]);

    // Section dan pertanyaan yang sedang aktif
    const currentSection = sections[currentSectionIndex];
    const isFirstSection = currentSectionIndex === 0;
    const isLastSection = currentSectionIndex === sections.length - 1;

    // Kalkulasi progress bar
    const completedCount = maxCompletedIndex + 1;
    const progressPercentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

    // Handler untuk mengubah catatan / notes abnormality
const handleNoteChange = (questionId: number, noteText: string) => {
    setAnswers(prev => {
        const currentAnswer = getAnswer(questionId);
        return {
            ...prev,
            [questionId]: {
                ...currentAnswer,
                note: noteText // Khusus untuk teks catatan/notes
            }
        };
    });
    if (noteText.trim() !== '') setErrorMessage(null);
};

    // Helper untuk mengambil objek jawaban per pertanyaan secara aman
    const getAnswer = (questionId: number) => {
        return answers[questionId] || { value: '', photos: [], note: '' };
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
    setAnswers(prev => {
        const currentAnswer = getAnswer(questionId);
        return {
            ...prev,
            [questionId]: {
                ...currentAnswer,
                value: val // Teks input, pilihan select, dll masuk ke sini
            }
        };
    });
    setErrorMessage(null);

    // Jika opsi yang dipilih memiliki aturan jump section
    if (selectedOption && selectedOption.goto_form_section_id) {
        setTargetJumpSectionId(selectedOption.goto_form_section_id);
    } else {
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

const handleFileUpload = async (questionId: number, e: React.ChangeEvent<HTMLInputElement>, questionItem: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('question_id', String(questionId)); // <-- Kirim ID agar backend bisa baca validation_rules admin
    formData.append('folder', 'question-files');

    try {
        const response = await axios.post('/inspection-form/upload-temp', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const filePath = response.data.path;

        setAnswers(prev => {
            const currentAns = getAnswer(questionId);
            return {
                ...prev,
                [questionId]: { 
                    ...currentAns, 
                    value: filePath 
                }
            };
        });
        setErrorMessage(null);
        e.target.value = '';

    } catch (error: any) {
        console.error("Gagal mengunggah file:", error);
        const serverMsg = error.response?.data?.message || "Gagal mengunggah file. Periksa ukuran dan formatnya.";
        triggerError(serverMsg);
    }
};

const handleAddPhoto = async (questionId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file & ukuran tetap sama...
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        triggerError('Format foto evidence harus berupa JPG, JPEG, atau PNG.');
        e.target.value = '';
        return;
    }

    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
        triggerError('Ukuran foto evidence terlalu besar. Maksimal 2MB.');
        e.target.value = '';
        return;
    }

    // Jika sebelumnya sudah ada foto tersimpan, hapus dulu file fisiknya dari storage server
    const currentAns = getAnswer(questionId);
    if (currentAns.photos && typeof currentAns.photos === 'string') {
        try {
            await axios.post('/inspection-form/remove-file', { path: currentAns.photos });
        } catch (error) {
            console.error("Gagal membersihkan foto lama:", error);
        }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'evidence-photos');

    try {
        const response = await axios.post('/inspection-form/upload-temp', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const filePath = response.data.path; // string path tunggal

        // Simpan sebagai string biasa
        setAnswers(prev => {
            const currentAns = getAnswer(questionId);
            return {
                ...prev,
                [questionId]: { 
                    ...currentAns, 
                    photos: filePath // Langsung string path tunggal
                }
            };
        });
        setErrorMessage(null);
        e.target.value = '';

    } catch (error: any) {
        console.error("Gagal mengunggah foto evidence:", error);
        const serverMsg = error.response?.data?.message || "Gagal mengunggah foto evidence ke server.";
        triggerError(serverMsg);
    }
};

const handleRemoveEvidencePhoto = async (questionId: number) => {
    const currentAns = getAnswer(questionId);
    const photoPath = currentAns.photos;

    if (photoPath && typeof photoPath === 'string') {
        try {
            await axios.post('/inspection-form/remove-file', { path: photoPath });
        } catch (error) {
            console.error("Gagal menghapus file evidence fisik dari server:", error);
        }
    }

    setAnswers(prev => {
        const currentAns = prev[questionId] || { value: '', photos: '', note: '' };
        return {
            ...prev,
            [questionId]: {
                ...currentAns,
                photos: '' 
            }
        };
    });
};

const handleRemoveFile = async (questionId: number) => {
    const currentAns = getAnswer(questionId);
    const filePath = currentAns.value;

    if (filePath && typeof filePath === 'string') {
        try {
            await axios.post('/inspection-form/remove-file', { path: filePath });
        } catch (error) {
            console.error("Gagal menghapus file fisik dari server:", error);
        }
    }

    setAnswers(prev => {
        const currentAns = prev[questionId] || { value: '', photos: [], note: '' };
        return {
            ...prev,
            [questionId]: {
                ...currentAns,
                value: '' 
            }
        };
    });
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
        answers,
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
        handleFileUpload,
        handleRemoveEvidencePhoto,
        handleRemoveFile,
        handleNext,
        triggerError
    }
}