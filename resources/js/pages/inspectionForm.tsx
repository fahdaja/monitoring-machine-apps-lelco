import FormLayout from "@/layouts/form-layout";
import ZoomOutModal from "@/components/common/ZoomOutModal";
import { Section, InspectionsFormProps } from "@/types/inspection";
import { useInspectionForm } from "@/hooks/use-inspection-form";
import { usePage } from "@inertiajs/react";

export default function InspectionForm() {
const currentTask = usePage<{currentTask: InspectionsFormProps}>().props.currentTask;
const sections: Section[] = currentTask?.form?.sections || [];
const {
isImageZoomed, setIsImageZoomed,
currentSectionIndex, setCurrentSectionIndex,
errorMessage, setErrorMessage,
errorRef,
currentSection,
currentQuestion,
currentAnswer,
completedCount,
handleValueChoice,
handleNoteChange,
handleAddPhoto,
handleRemovePhoto,
maxCompletedIndex
} = useInspectionForm(sections);

return (
    <FormLayout>
        <div className="flex gap-6 items-start w-full p-6 bg-slate-50 min-h-[calc(100vh-4rem)]">
            {/* SIDEBAR: Konsisten dengan Admin/List View */}
            <aside className="w-80 shrink-0 bg-white border border-slate-200 rounded-xl flex flex-col max-h-[calc(100vh-7rem)] sticky top-6 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <h2 className="font-semibold text-slate-800 text-base">Progress Inspection</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{completedCount} dari {sections.length} section lengkap</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {sections.map((sec, index) => {
                        const isActive = currentSectionIndex === index;
                        const isDone = index <= maxCompletedIndex;
                        const isUnlocked = index === 0 || index <= maxCompletedIndex + 1 || index === currentSectionIndex;

                        let statusText = 'Belum dikerjakan';
                        let statusBadgeBg = 'bg-slate-100 text-slate-600';

                        if (isDone) {
                            statusText = 'Selesai';
                            statusBadgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                        } else if (isActive) {
                            statusText = 'Sedang dikerjakan';
                            statusBadgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                        }

                        return (
                            <div
                                key={sec.section_id}
                                onClick={() => {
                                    if (isUnlocked) {
                                        setCurrentSectionIndex(index);
                                        setErrorMessage(null);
                                    }
                                }}
                                className={`group flex items-start gap-3 rounded-lg p-3 text-sm transition-all ${
                                    !isUnlocked
                                        ? 'bg-slate-50/50 opacity-40 cursor-not-allowed'
                                        : isActive
                                        ? 'bg-blue-50/60 border border-blue-200 shadow-sm cursor-pointer'
                                        : 'hover:bg-slate-50 border border-transparent cursor-pointer'
                                }`}
                            >
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 mt-0.5 ${
                                    isDone 
                                        ? 'bg-emerald-600 text-white' 
                                        : isActive 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {isDone ? '✓' : index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-xs text-slate-900 truncate">
                                            {sec.section_code}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadgeBg}`}>
                                            {statusText}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                                        {sec?.section_title}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* MAIN CONTENT FORM: Didesain agar selaras dengan styling Admin */}
            <main className="bg-white flex-1 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div ref={errorRef} />

                {/* Header Section */}
                <div className="bg-white py-4 px-6 border-b border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                            Section {currentSectionIndex + 1} dari {sections.length}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                            {currentSection?.section_code}
                        </span>
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">
                        {currentSection?.section_title}
                    </h1>
                </div>

                <div className="p-6 space-y-6">
                    {/* Error Alert */}
                    {errorMessage && (
                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 shadow-sm animate-fadeIn">
                            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-xs font-semibold">{errorMessage}</span>
                        </div>
                    )}

                    {/* Question & Standard */}
                    <div className="space-y-3">
                        <h2 className="text-base font-bold text-slate-900 leading-snug">
                            Apakah {currentSection?.section_title} bersih dari debu, ceceran bijih material, minyak, dan benda asing?
                        </h2>
                        <p className="text-xs font-medium text-slate-500">
                            <strong className="text-slate-700">Metode:</strong> Pemeriksaan Visual / Touch
                        </p>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/70 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider text-slate-500">Standar Pemeriksaan:</span>
                            Pastikan {currentSection?.section_title} bersih dari debu, ceceran bijih material, minyak, dan benda asing.
                        </div>
                    </div>

                    {/* Image Preview Box */}
                    <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group p-3">
                        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden relative shadow-sm">
                            <img
                                src="/images/IMG-20261019-WA0001.jpg"
                                alt={currentSection?.section_title}
                                className="w-full max-h-[360px] object-contain rounded-lg cursor-pointer bg-slate-900/5 transition hover:opacity-95"
                                onClick={() => setIsImageZoomed(true)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsImageZoomed(true)}
                                className="absolute bottom-4 right-4 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-md cursor-pointer transition flex items-center gap-1.5 backdrop-blur-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                </svg>
                                Preview Gambar
                            </button>
                        </div>
                    </div>

                    {/* Choice Buttons (OK / NG) */}
                    {currentQuestion?.input_type === 'CHOICE' && (
                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={() => handleValueChoice('OK')}
                                className={`
                                    flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border 
                                    transition-all duration-200 ease-out cursor-pointer active:scale-95 select-none shadow-sm
                                    ${currentAnswer.value === 'OK'
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/20 shadow-md ring-2 ring-emerald-600/20'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-700'
                                    }
                                `}
                            >
                                <span>OK (Good)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleValueChoice('NG')}
                                className={`
                                    flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border 
                                    transition-all duration-200 ease-out cursor-pointer active:scale-95 select-none shadow-sm
                                    ${currentAnswer.value === 'NG'
                                        ? 'bg-rose-600 border-rose-600 text-white shadow-rose-500/20 shadow-md ring-2 ring-rose-600/20'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/40 hover:text-rose-700'
                                    }
                                `}
                            >
                                <span>NG (Not Good)</span>
                            </button>
                        </div>
                    )}

                    {/* Conditional NG Notes */}
                    {currentAnswer.value === "NG" && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Catatan / Notes {currentSection?.section_code} <span className="text-rose-600">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={currentAnswer.note}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder="Jelaskan abnormality dan tindakan awal yang dilakukan..."
                                className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                            />
                        </div>
                    )}

                    <hr className="border-slate-200 my-6" />

                    {/* Upload Evidence Section */}
                    <div className="space-y-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Upload Evidence - {currentSection?.section_code} {currentSection?.section_title} <span className="text-rose-500">*</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Wajib upload foto hasil pemeriksaan aktual</p>
                        </div>

                        <div className="flex flex-wrap gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs font-semibold transition shadow-sm active:scale-95">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                            <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs font-semibold transition shadow-sm active:scale-95">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                        {/* Photo Previews */}
                        {currentAnswer.photos.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <p className="text-xs font-semibold text-slate-700">File Foto Terpilih ({currentAnswer.photos.length}):</p>
                                {currentAnswer.photos.map((photo, pIndex) => (
                                    <div key={pIndex} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-xs">
                                        <span className="text-xs text-slate-700 truncate max-w-xs font-medium">{photo.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePhoto(pIndex)}
                                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition cursor-pointer"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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