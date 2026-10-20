import { Section, SectionAnswer } from "@/types/inspection";
import { useRef, useState } from "react";


export function useInspectionForm(sections: Section[]) {
        const [isImageZoomed, setIsImageZoomed] = useState(false);
        const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
        const [maxCompletedIndex, setMaxCompletedIndex] = useState(-1);
        const [errorMessage, setErrorMessage] = useState<string | null>(null);
        const errorRef = useRef<HTMLDivElement>(null);

        const [answers, setAnswers] = useState<Record<number, SectionAnswer>>({});
        
        const currentSection = sections[currentSectionIndex];
        const isFirstSection = currentSectionIndex === 0;
        const isLastSection = currentSectionIndex === sections.length - 1;
        
        const currentQuestion = sections[currentSectionIndex]?.questions?.[0];
        const currentAnswer = answers[currentSectionIndex] || { value: '', input_type: currentQuestion?.input_type || '', note: '', photos: [] };
        
        const completedCount = maxCompletedIndex + 1;
        const progressPercentage = Math.round((completedCount / sections.length) * 100);

        const handleValueChoice = (val: string) => {
                setAnswers(prev => ({
                    ...prev,
                    [currentSectionIndex]: {
                        ...currentAnswer,
                        value: val
                    }
                }));
                setErrorMessage(null);
            };
        
            const handleNoteChange = (noteText: string) => {
                setAnswers(prev => ({
                    ...prev,
                    [currentSectionIndex]: {
                        ...currentAnswer,
                        note: noteText
                    }
                }));
                if (noteText.trim() !== '') setErrorMessage(null);
            };
        
            const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (file) {
                    setAnswers(prev => ({
                        ...prev,
                        [currentSectionIndex]: {
                            ...currentAnswer,
                            photos: [...currentAnswer.photos, file]
                        }
                    }));
                    setErrorMessage(null);
                }
                e.target.value = '';
            };
        
            const handleRemovePhoto = (photoIndex: number) => {
                setAnswers(prev => ({
                    ...prev,
                    [currentSectionIndex]: {
                        ...currentAnswer,
                        photos: currentAnswer.photos.filter((_, idx) => idx !== photoIndex)
                    }
                }));
            };
        
            const handlePrev = () => {
                if (!isFirstSection) {
                    setCurrentSectionIndex((prev) => prev - 1);
                    setErrorMessage(null);
                }
            };
        
            // Handler untuk Numeric
        const handleValueNumeric = (val: string) => {
            setAnswers(prev => ({
                ...prev,
                [currentSectionIndex]: {
                    ...currentAnswer,
                    value: val
                }
            }));
            if (val.trim() !== '') setErrorMessage(null);
        };
        
            const handleNext = () => {
        
                const inputType = currentQuestion?.input_type;
                // 1. Input nilai 
                if (inputType === 'NUMERIC') {
                    if(!currentAnswer.value || currentAnswer.value === '') {
                        triggerError("Input nilai terlebih dahulu sebelum melanjutkan");
                        return;
                    }
                    if(Number(currentAnswer.value) < Number(currentQuestion.min_value) || Number(currentAnswer.value) > Number(currentQuestion.max_value)) {
                        triggerError("Input nilai tidak sesuai dengan standar yang telah ditentukan");
                        return;
                    }
                }
        
                // 2. Pilihan status OK/NG
                if(inputType === 'CHOICE') {
                    if(currentAnswer.value !== 'OK' && currentAnswer.value !== 'NG') {
                        triggerError("Pilih status OK atau NG terlebih dahulu sebelum melanjutkan");
                        return;
                    }
                    if(currentAnswer.value === 'NG' && !currentAnswer.note || currentAnswer.note.trim() === '') {
                        triggerError("Catatan / Notes wajib diisi karena memilih status NG.");
                        return;
                    }
                }
        
                // 3. Foto Evidence Wajib
                if (currentAnswer.photos.length === 0) {
                    triggerError("Anda wajib mengunggah minimal 1 foto evidence hasil pemeriksaan sebelum melanjutkan.");
                    return;
                }
        
                setErrorMessage(null);
        
                if (currentSectionIndex > maxCompletedIndex) {
                    setMaxCompletedIndex(currentSectionIndex);
                }
        
                if (!isLastSection) {
                    setCurrentSectionIndex((prev) => prev + 1);
                } else {
                    alert('Semua section inspeksi telah selesai dan lengkap! Siap disimpan.');
                }
            };
        
            // Fungsi bantu untuk menampilkan error sekaligus menggeser layar (auto-scroll) ke atas
            const triggerError = (msg: string) => {
                setErrorMessage(msg);
                if (errorRef.current) {
                    errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
        
            // ambil batas minimal value & max value dari questions 
            const minValue = currentQuestion?.min_value !== undefined && currentQuestion?.min_value !== null ? Number(currentQuestion.min_value): null;
            const maxValue = currentQuestion?.max_value !== undefined && currentQuestion?.max_value !== null ? Number(currentQuestion.max_value): null;
        
            // melakukan pengecekan real-time 
            const numericValue = parseFloat(currentAnswer.value);
            const hasEnteredValue = currentAnswer.value.trim() !== '' && !isNaN(numericValue);
            
            // fungsi standar 
            const isWithinStandard = hasEnteredValue && ( minValue === null || numericValue >= minValue) && (maxValue === null || numericValue <= maxValue);

            return {
                isImageZoomed,
                setIsImageZoomed,
                currentSectionIndex,
                setCurrentSectionIndex,
                maxCompletedIndex,
                setMaxCompletedIndex,
                errorMessage,
                setErrorMessage,
                errorRef,
                answers,
                setAnswers,
                currentSection,
                isFirstSection,
                isLastSection,
                currentQuestion,
                currentAnswer,
                completedCount,
                progressPercentage,
                handleValueChoice,
                handleNoteChange,
                handleAddPhoto,
                handleRemovePhoto,
                handlePrev,
                handleValueNumeric,
                handleNext,
                triggerError,
                minValue,
                maxValue,
                numericValue,
                hasEnteredValue,
                isWithinStandard,
                
            }
        
}