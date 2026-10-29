import { Link } from "@inertiajs/react";
import { Section, InspectionsFormProps } from "@/types/inspection";
import { useInspectionForm } from "@/hooks/use-inspection-form";

export default function FormLayout({
    tasks,
    children,
    footer,
}: InspectionsFormProps & {
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
   const currentTask = tasks?.[0];
    const sections: Section[] = currentTask?.form?.sections || [];

     const {
            currentSectionIndex,
            isFirstSection, isLastSection,
            progressPercentage,
            handlePrev,
            handleNext        } = useInspectionForm(sections);
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
            {/* Topbar Header */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                            <span className="block text-[9px] text-slate-400">PT LELCO TRINDO NUSANTARA</span>
                            <strong className="block text-sm font-extrabold leading-tight text-white">
                                L1 Injection Molding
                            </strong>
                            <span className="block text-[9px] text-slate-400">FMNCINJ00001 Mesin Injection Super Master 350 Ton SN L1</span>
                        </div>
                    </div>
                </div>

                {/* User Info & Quick Action */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/machines"
                        className="text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-xl transition-colors"
                    >
                        Tutup
                    </Link>
                </div>  
            </header>

            {/* Isi Halaman (Diberi pb-20 agar konten bawah tidak tertutup footer) */}
            <div className="flex-1 pb-20 bg-slate-100">
                {children}
            </div>

            <footer className="h-16 bg-white border-t border-slate-300 fixed bottom-0 left-0 right-0 z-40 px-4 md:px-8 flex items-center shadow-lg">
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
                </footer>
            
        </div>
    );
}
