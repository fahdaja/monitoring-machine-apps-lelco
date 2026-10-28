import FormLayout from "@/layouts/form-layout";
import ZoomOutModal from "@/components/common/ZoomOutModal";
import { Section, InspectionsFormProps } from "@/types/inspection";
import { useInspectionForm } from "@/hooks/use-inspection-form";

export default function InspectionForm({ tasks }: InspectionsFormProps) {
    const currentTask = tasks?.[0];
    const sections: Section[] = currentTask?.form?.sections || [];

    const {
        isImageZoomed, setIsImageZoomed,
        currentSectionIndex, setCurrentSectionIndex,
        errorMessage, setErrorMessage,
        errorRef,
        currentSection,
        isFirstSection, isLastSection,
        currentQuestion,
        currentAnswer,
        completedCount,
        progressPercentage,
        handleValueChoice,
        handleNoteChange,
        handleAddPhoto,
        handleRemovePhoto,
        handlePrev,
        handleNext,
        maxCompletedIndex
    } = useInspectionForm(sections);

    console.log(currentSection)
    return (
        <FormLayout
            footer={
                <div className="w-full flex items-center justify-between gap-4">
                    {/* Tombol Sebelumnya */}
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={isFirstSection}
                        className={`
                            px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 border transition-all cursor-pointer
                            ${isFirstSection
                                ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-95 shadow-xs'
                            }
                        `}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Sebelumnya</span>
                    </button>

                    {/* Progress Bar (Tengah) */}
                    <div className="flex-1 max-w-md hidden sm:flex flex-col items-center gap-1.5">
                        <div className="w-full flex justify-between text-xs font-semibold text-slate-600">
                            <span>Section {currentSectionIndex + 1} dari {sections.length}</span>
                            <span className="text-emerald-600 font-bold">{progressPercentage}% Selesai</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Tombol Selanjutnya / Selesai */}
                    <button
                        type="button"
                        onClick={handleNext}
                        className={`
                            px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95
                            ${isLastSection
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                            }
                        `}
                    >
                        <span>{isLastSection ? 'Selesai & Kirim' : 'Selanjutnya'}</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            }
        >
            <div className="flex gap-5 items-start w-full px-5 pt-5 pb-5 bg-slate-100">
                <aside className="w-80 shrink-0 bg-white border border-slate-300 rounded-lg flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden shadow-sm">
                    <div className="px-5 py-3 bg-slate-200 border-b border-slate-300">
                        <h2 className="font-bold text-lg">Progress Inspection</h2>
                        <p className="text-xs">{completedCount} dari {sections.length} section lengkap</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        <ul className="space-y-2">
                            {sections.map((sec, index) => {
                                const isActive = currentSectionIndex === index;
                                const isDone = index <= maxCompletedIndex;
                                const isUnlocked = index === 0 || index <= maxCompletedIndex + 1 || index === currentSectionIndex;

                                let statusText = 'Belum dikerjakan';
                                let statusColor = 'text-slate-400';

                                if (isDone) {
                                    statusText = 'Selesai';
                                    statusColor = 'text-emerald-500 font-medium';
                                } else if (isActive) {
                                    statusText = 'Sedang dikerjakan';
                                    statusColor = 'text-blue-600 font-medium';
                                }

                                return (
                                    <li
                                        key={sec.section_id}
                                        onClick={() => {
                                            if (isUnlocked) {
                                                setCurrentSectionIndex(index);
                                                setErrorMessage(null);
                                            }
                                        }}
                                        className={`group flex items-center gap-4 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                                            !isUnlocked
                                                ? 'bg-slate-50 opacity-40 cursor-not-allowed text-slate-400'
                                                : isActive
                                                    ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300 cursor-pointer'
                                                    : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                                        }`}
                                    >
                                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                                            isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
                                        }`}>
                                            {isDone ? '✓' : index + 1}
                                        </span>
                                        <div className="text-xs flex flex-col gap-1">
                                            <span className="truncate font-bold text-slate-800">
                                                {sec.section_code} <span>•</span> {sec?.section_title}
                                            </span>
                                            <p className="font-normal text-slate-500">{sec.section_code}</p>
                                            <span className={statusColor}>
                                                {statusText}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </aside>

                <main className="bg-white flex-1 border border-slate-300 rounded-lg overflow-hidden shadow-sm">
                    {/* Anchor ref untuk auto-scroll ketika error muncul */}
                    <div ref={errorRef} />

                    <div className="bg-slate-200 py-3 border-b border-slate-300 px-4 rounded-t-lg shrink-0">
        
                        <p className="text-xs font-normal text-slate-500">{currentSection?.section_code} • Section {currentSectionIndex + 1} dari {sections.length}</p>
                        <h1 className="font-bold text-slate-800">{currentSection?.section_code} <span>•</span> {currentSection?.section_title}</h1>
                        <p className="text-xs text-slate-600 mt-1">C - Clean
                            Pastikan Hopper Body bersih dari debu, bijih material yang tercecer, minyak, dan benda asing.
                            Metode: Pemeriksaan Visual / Touch</p>
                    </div>

                    <div className="p-5">
                        {/* ALERT PESAN ERROR MUNCUL DI ATAS FORM */}
                        {errorMessage && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl flex items-center gap-3 shadow-sm transition-all">
                                <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-xs font-bold">{errorMessage}</span>
                            </div>
                        )}

                        <h1 className="font-bold text-slate-800 text-xl">Apakah {currentSection?.section_title} bersih dari debu, ceceran bijih material, minyak, dan benda asing?</h1>
                        <p className="text-slate-600">Metode: Pemeriksaan Visual / Touch</p>
                        <div className="mt-5 rounded-xl border border-slate-300 p-4 bg-slate-100">
                            <span className="px-3 py-3"> Standar: Pastikan {currentSection?.section_title} bersih dari debu, ceceran bijih material, minyak, dan benda asing</span>
                        </div>
                        <div className="mt-4 relative bg-slate-100 rounded-lg border border-slate-300 overflow-hidden group">
                            <div className="bg-white m-4 rounded-lg">
                                <img
                                    src="/images/IMG-20261019-WA0001.jpg"
                                    alt={currentSection?.section_title}
                                    className="w-full max-h-120 object-contain rounded-lg cursor-pointer"
                                    onClick={() => setIsImageZoomed(true)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsImageZoomed(true)}
                                    className="absolute bottom-6 right-6 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md cursor-pointer transition flex items-center gap-1.5 backdrop-blur-xs"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                    </svg>
                                    Preview Gambar
                                </button>
                            </div>
                        </div>
                            {currentQuestion?.input_type === 'CHOICE' && (
                        <div className="flex gap-4 mt-6 justify-center">
                            {/* Tombol OK */}
                            <button
                                type="button"
                                onClick={() => handleValueChoice('OK')}
                                className={`
                                    flex-1 py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 border-2 
                                    transition-all duration-200 ease-out cursor-pointer active:scale-95 select-none
                                    ${currentAnswer.value === 'OK'
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700 hover:scale-[1.02] shadow-sm'
                                    }
                                `}
                            >
                                <span>OK</span>
                            </button>
                            {/* Tombol NG (Not Good) */}
                            <button
                                type="button"
                                onClick={() => handleValueChoice('NG')}
                                className={`
                                    flex-1 py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 border-2 
                                    transition-all duration-200 ease-out cursor-pointer active:scale-95 select-none
                                    ${currentAnswer.value === 'NG'
                                        ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30 scale-[1.02]'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:bg-rose-50/50 hover:text-rose-700 hover:scale-[1.02] shadow-sm'
                                    }
                                `}
                            >
                                <span>NG</span>
                            </button>
                        </div>
                        )}

                        

                        {/* CONDITIONAL RENDERING: Catatan NG */}
                        {currentAnswer.value === "NG" && (
                            <div className="mb-6 p-4 bg-slate-50/50 border border-slate-200 rounded-xl animate-fadeIn mt-4">
                                <label className="block text-xs font-bold mb-2 uppercase tracking-wider">
                                    <p>Catatan / Notes {currentSection?.section_code} (Wajib diisi) <span className="text-red-600 text-md">*</span></p>
                                </label>
                                <textarea
                                    rows={3}
                                    value={currentAnswer.note}
                                    onChange={(e) => handleNoteChange(e.target.value)}
                                    placeholder="Jelaskan abnormality dan tindakan awal yang dilakukan."
                                    className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-800"
                                />
                            </div>
                        )}

                        <div className="mt-4 border-slate-200 shadow-md border-1 mt-8"></div>
                        <div className="mt-4">
                            <h1 className="text-xl font-bold text-slate-800">Upload Evidence - {currentSection?.section_code} {currentSection?.section_title} <span className="text-red-500">*</span></h1>
                            <p className="text-slate-500 text-md mt-4">Wajib upload foto hasil pemeriksaan aktual</p>
                        </div>
                        <div className="flex mt-4 gap-3 bg-slate-100 p-4 rounded-xl">
                            <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 font-medium transition shadow-sm active:scale-95">
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Ambil Foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleAddPhoto}
                                />
                            </label>

                            <label className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 font-medium transition shadow-sm active:scale-95">
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Pilih Foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAddPhoto}
                                />
                            </label>
                        </div>
                        {/* List Preview Foto yang Sudah Di-upload */}
                        {currentAnswer.photos.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-bold text-slate-600">File Foto Terpilih ({currentAnswer.photos.length}):</p>
                                {currentAnswer.photos.map((photo, pIndex) => (
                                    <div key={pIndex} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                                        <span className="text-xs text-slate-700 truncate max-w-xs font-medium">{photo.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(pIndex)}
                                            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 bg-rose-50 rounded border border-rose-200 cursor-pointer"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <ZoomOutModal
                isOpen={isImageZoomed}
                onClose={() => setIsImageZoomed(false)}
                imageSrc="/images/IMG-20261019-WA0001.jpg"
                altText={currentSection?.section_title}
                title={`${currentSection?.section_title} Zoom Out`}
            />
        </FormLayout>
    );
}