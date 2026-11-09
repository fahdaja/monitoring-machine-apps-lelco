    import axios from "axios";
    import { useEffect, useState } from "react";

    export function useInspectionForm(sections: any[], initialAnswers: Record<number, any> = {}, initialSectionIndex: number = 0, taskId?: number) {

        const storageKey = `inspection_answers_${window.location.pathname}`;

        const parseAnswersData = (rawData: any) => {
            let mapped: Record<number, any> = {};

            if (rawData && !rawData.sections && !Array.isArray(rawData) && Object.keys(rawData).length > 0) {
                const firstKey = Object.keys(rawData)[0];
                if (!isNaN(Number(firstKey))) {
                    return rawData;
                }
            }

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
        
        // Cari index aktif
        const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(() => {
            if (initialSectionIndex > 0) return initialSectionIndex;
            
            const storageSectionKey = taskId ? `inspection_section_${taskId}` : `inspection_section_index`;
            const savedLocal = localStorage.getItem(storageSectionKey);
            return savedLocal ? parseInt(savedLocal, 10) : 0;
        });
        
        // 💡 STATE ERROR PER PERTANYAAN (Ganti errorMessage global)S
        const [questionErrors, setQuestionErrors] = useState<Record<number, Record<string,string>>>({});

        const setQuestionError = (questionId: number, fieldOrMsg: 'value' | 'note' | 'photos' | string, maybeMsg?: string) => {
    let field: 'value' | 'note' | 'photos' = 'value';
    let msg = '';

    // Deteksi apakah dipanggil dengan 2 argumen (questionId, msg) atau 3 argumen (questionId, field, msg)
    if (maybeMsg === undefined) {
        field = 'value'; // Default ke 'value' jika hanya 2 argumen
        fieldOrMsg = fieldOrMsg as string;
        msg = fieldOrMsg;
    } else {
        field = fieldOrMsg as 'value' | 'note' | 'photos';
        msg = maybeMsg;
    }

    setQuestionErrors(prev => {
        const currentQuestionErrors = prev[questionId] || {};
        return {
            ...prev,
            [questionId]: {
                ...currentQuestionErrors,
                [field]: msg
            }
        };
    });
};

        // 💡 Fungsi clear error (bisa menghapus seluruh error per pertanyaan atau spesifik per field)
        const clearQuestionError = (questionId: number, field?: 'value' | 'note' | 'photos') => {
            setQuestionErrors(prev => {
                if (!prev[questionId]) return prev;
                
                // Jika field tidak disertakan, hapus semua error untuk questionId tersebut
                if (!field) {
                    const updated = { ...prev };
                    delete updated[questionId];
                    return updated;
                }

                // Jika field disertakan, hapus error pada field tertentu saja
                const updatedField = { ...prev[questionId] };
                delete updatedField[field];
                
                if (Object.keys(updatedField).length === 0) {
                    const updated = { ...prev };
                    delete updated[questionId];
                    return updated;
                }

                return { ...prev, [questionId]: updatedField };
            });
        };

        // Batas section terjauh yang sudah berhasil diselesaikan/dilewati
        const [maxCompletedIndex, setMaxCompletedIndex] = useState<number>(() => {
            if (!taskId) return -1;
            const savedMax = localStorage.getItem(`inspection_max_completed_${taskId}`);
            if (savedMax !== null) {
                return parseInt(savedMax, 10);
            }
            return currentSectionIndex > 0 ? currentSectionIndex - 1 : -1;
        });

        // State untuk menampung jawaban
        const [answers, setAnswers] = useState<Record<number, any>>(() => {
            try {
                const savedLocal = localStorage.getItem(storageKey);
                if (savedLocal) {
                    const parsedLocal = JSON.parse(savedLocal);
                    const converted = parseAnswersData(parsedLocal);
                    if (Object.keys(converted).length > 0) {
                        return converted;
                    }
                }
            } catch (e) {
                console.error("Gagal membaca LocalStorage:", e);
            }

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

        useEffect(() => {
            if (taskId && currentSectionIndex >= 0) {
                localStorage.setItem(`inspection_section_${taskId}`, currentSectionIndex.toString());
            }
        }, [currentSectionIndex, taskId]);

        useEffect(() => {
            if (taskId && maxCompletedIndex >= -1) {
                localStorage.setItem(`inspection_max_completed_${taskId}`, maxCompletedIndex.toString());
            }
        }, [maxCompletedIndex, taskId]);

        const currentSection = sections[currentSectionIndex];
        const isFirstSection = currentSectionIndex === 0;
        const isLastSection = currentSectionIndex === sections.length - 1;

        const completedCount = maxCompletedIndex + 1;
        const progressPercentage = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

        const handleNoteChange = (questionId: number, noteText: string) => {
            setAnswers(prev => {
                const currentAnswer = getAnswer(questionId);
                return {
                    ...prev,
                    [questionId]: {
                        ...currentAnswer,
                        note: noteText
                    }
                };
            });
            if (noteText.trim() !== '') clearQuestionError(questionId);
        };

        const getAnswer = (questionId: number) => {
            return answers[questionId] || { value: '', photos: [], note: '' };
        };

        const handleValueChoice = (questionId: number, val: any, selectedOption?: any) => {
            setAnswers(prev => {
                const currentAnswer = getAnswer(questionId);
                return {
                    ...prev,
                    [questionId]: {
                        ...currentAnswer,
                        value: val
                    }
                };
            });
            clearQuestionError(questionId);

            if (selectedOption && selectedOption.goto_form_section_id) {
                setTargetJumpSectionId(selectedOption.goto_form_section_id);
            } else {
                setTargetJumpSectionId(null);
            }
        };

        const handlePrev = () => {
            if (!isFirstSection) {
                setCurrentSectionIndex(prev => prev - 1);
                setQuestionErrors({});
            }
        };

        const handleFileUpload = async (questionId: number, e: React.ChangeEvent<HTMLInputElement>, questionItem: any) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // 💡 1. Ambil aturan validasi dinamis dari questionItem (validation_rules)
            let fileRules: any = {};
            if (questionItem.validation_rules) {
                try {
                    let parsed = typeof questionItem.validation_rules === 'string' 
                        ? JSON.parse(questionItem.validation_rules) 
                        : questionItem.validation_rules;
                    
                    fileRules = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
                } catch (e) {
                    console.error("Gagal parsing validation rules", e);
                }
            }

            // 💡 2. Validasi Tipe File di Client-Side (jika ada aturannya dari database)
            // Contoh format allowed_file_type di database bisa berupa array ['jpg', 'png', 'pdf'] atau string
            if (fileRules.allowed_file_type) {
                const allowedTypes = Array.isArray(fileRules.allowed_file_type) 
                    ? fileRules.allowed_file_type.map((t: string) => t.toLowerCase().replace('.', ''))
                    : [fileRules.allowed_file_type].map((t: string) => t.toLowerCase().replace('.', ''));
                
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
                
                if (!allowedTypes.includes(fileExtension)) {
                    setQuestionError(questionId, 'value', `Format file harus berupa: ${allowedTypes.join(', ').toUpperCase()}`);
                    e.target.value = '';
                    return;
                }
            }

            // 💡 3. Validasi Ukuran File Maksimal di Client-Side (default aman 5MB jika tidak diset)
            const maxMb = fileRules.max_file_size ? parseInt(fileRules.max_file_size) : 5; 
            const maxSizeBytes = maxMb * 1024 * 1024; 

            if (file.size > maxSizeBytes) {
                setQuestionError(questionId, 'value', `Ukuran file terlalu besar. Maksimal ${maxMb}MB.`);
                e.target.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('question_id', String(questionId)); 
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
                clearQuestionError(questionId);
                e.target.value = '';

            } catch (error: any) {
                console.error("Gagal mengunggah file:", error);
                
                const serverErrors = error.response?.data?.errors;
                let serverMsg = "Gagal mengunggah file. Periksa ukuran dan formatnya.";

                if (serverErrors && serverErrors.file && serverErrors.file.length > 0) {
                    serverMsg = serverErrors.file[0];
                } else if (error.response?.data?.message) {
                    serverMsg = error.response.data.message;
                }
                
                setQuestionError(questionId, 'value', serverMsg);
                e.target.value = '';
            }
        };

    const handleAddPhoto = async (questionId: number, e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                setQuestionError(questionId, 'photos','Format foto evidence harus berupa JPG, JPEG, atau PNG.');
                e.target.value = '';
                return;
            }

            // Batasan ukuran client-side 2MB
            const maxSizeBytes = 2 * 1024 * 1024; 
            if (file.size > maxSizeBytes) {
                setQuestionError(questionId, 'photos','Ukuran foto evidence terlalu besar. Maksimal 2MB.');
                e.target.value = '';
                return;
            }

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

                const filePath = response.data.path;

                setAnswers(prev => {
                    const currentAns = getAnswer(questionId);
                    return {
                        ...prev,
                        [questionId]: { 
                            ...currentAns, 
                            photos: filePath 
                        }
                    };
                });
                if (setQuestionError) {
                setQuestionError(questionId, 'photos', null as any);
            }
            e.target.value = '';

            } catch (error: any) {
                console.error("Gagal mengunggah foto evidence:", error);
                
                // 🔍 Tangkap pesan spesifik dari validasi errors Laravel (file.max atau file.mimes)
                const serverErrors = error.response?.data?.errors;
                let serverMsg = "Gagal mengunggah foto evidence ke server.";

                if (serverErrors && serverErrors.file && serverErrors.file.length > 0) {
                    serverMsg = serverErrors.file[0]; // Mengambil pesan kustom dari backend
                } else if (error.response?.data?.message) {
                    serverMsg = error.response.data.message;
                }
                
                setQuestionError(questionId, 'photos', serverMsg);
                e.target.value = '';
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
            let hasError = false;

            // Reset error section ini sebelum validasi ulang
            setQuestionErrors({});

            // 1. Validasi per pertanyaan secara menyeluruh
            for (const q of questions) {
                const ans = getAnswer(q.id);

                if (q.is_required && (!ans.value || (Array.isArray(ans.value) && ans.value.length === 0))) {
                    setQuestionError(q.id, 'value', `Pertanyaan "${q.question_text}" wajib diisi.`);
                    hasError = true;
                    continue;
                }

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

                if ((q.input_type === 'TEXT' || q.input_type === 'TEXTAREA') && ans.value) {
                    if (rules.expected_answer && String(ans.value).trim() !== String(rules.expected_answer).trim()) {
                        const customErrorMsg = rules.validation_error_message && rules.validation_error_message.trim() !== ''
                            ? rules.validation_error_message 
                            : `Jawaban untuk "${q.question_text}" tidak sesuai dengan standar.`;
                        
                        setQuestionError(q.id, customErrorMsg);
                        hasError = true;
                    }
                }
            }


            

            // Jika ada error pada pertanyaan, hentikan proses next (tidak pindah section)
            if (hasError) {
                return;
            }

            // 2. Cek apakah ada opsi di section ini yang memiliki instruksi 'goto_form_section_id' (Jump Section)
            let targetJumpSectionId = null;
            for (const q of questions) {
                const ans = getAnswer(q.id);
                if (ans.value !== undefined && ans.value !== '' && q.options) {
                    const selectedOpt = q.options.find((o: any) => Number(o.id) === Number(ans.value));
                    if (selectedOpt && selectedOpt.goto_form_section_id) {
                        targetJumpSectionId = selectedOpt.goto_form_section_id;
                        break; 
                    }
                }
            }

            // 3. Eksekusi perpindahan section (Menangani Jump maupun Normal Next)
            if (targetJumpSectionId !== null) {
                const targetIndex = sections.findIndex(sec => Number(sec.id) === Number(targetJumpSectionId));
                if (targetIndex !== -1) {
                    const furthestIndex = Math.max(currentSectionIndex, targetIndex - 1, maxCompletedIndex);
                    setMaxCompletedIndex(furthestIndex);
                    if (taskId) {
                        localStorage.setItem(`inspection_max_completed_${taskId}`, furthestIndex.toString());
                    }

                    setCurrentSectionIndex(targetIndex);
                    return;
                }
            }

            // Jika alur normal (tidak ada jump)
            if (currentSectionIndex > maxCompletedIndex) {
                const newMax = currentSectionIndex;
                setMaxCompletedIndex(newMax);
                if (taskId) {
                    localStorage.setItem(`inspection_max_completed_${taskId}`, newMax.toString());
                }
            }

            


            if (!isLastSection) {
                setCurrentSectionIndex(prev => prev + 1);
            } else {
                alert('Semua section inspeksi selesai!');
            }
        };

        return {
            currentSectionIndex,
            setCurrentSectionIndex,
            questionErrors, // 👈 Ekspor ini untuk dipakai di UI
            maxCompletedIndex,
            answers,
            currentSection,
            isFirstSection,
            isLastSection,
            completedCount,
            progressPercentage,
            handleNoteChange,
            setQuestionError,
            getAnswer,
            handleValueChoice,
            handlePrev,
            handleAddPhoto,
            handleFileUpload,
            handleRemoveEvidencePhoto,
            handleRemoveFile,
            handleNext,
            clearQuestionError,
        }
    }