import { Link, usePage } from "@inertiajs/react";
import { useState } from "react";

interface FormLayoutProps {
    children: React.ReactNode;
    currentSectionIndex: number;
    totalSections: number;
    progressPercentage: number;
    isFirstSection: boolean;
    isLastSection: boolean;
    handlePrev: () => void;
    handleNext: () => void;
    onSubmitFinal?: () => void;
    isSubmitting?: boolean;
}

export default function FormLayout({
    children,
    currentSectionIndex,
    totalSections,
    progressPercentage,
    isFirstSection,
    isLastSection,
    handlePrev,
    handleNext,
    onSubmitFinal,
    isSubmitting = false,
}: FormLayoutProps) {
    const { task, form } = usePage<any>().props;

    const formTitle = task?.form?.form_title || form?.form_title || 'Formulir Inspeksi';

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleActionClick = () => {
        if (isLastSection) {
            setShowConfirmModal(true);
        } else {
            handleNext();
        }
    };

    const handleConfirmSubmit = () => {
        setShowConfirmModal(false);
        if (onSubmitFinal) onSubmitFinal();
    };

    return (
        <div className="min-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col font-sans">
            {/* ============ HEADER ============ */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 sticky top-0 z-40 shadow-md shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wide truncate">
                            PT LELCO TRINDO NUSANTARA
                        </span>
                        <strong
                            className="block text-xs sm:text-sm font-extrabold leading-tight text-white truncate"
                            title={formTitle}
                        >
                            {formTitle}
                        </strong>
                    </div>
                </div>

                <Link
                    href="/inspection-calender"
                    className="text-[11px] sm:text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-2.5 sm:px-3 py-2 rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                    Tutup
                </Link>
            </header>

            {/* ============ KONTEN ============ */}
            <div
                className="flex-1 bg-slate-100
                           pb-[calc(5rem+env(safe-area-inset-bottom))]
                           sm:pb-[calc(5rem+env(safe-area-inset-bottom))]"
            >
                {children}
            </div>

            {/* ============ FOOTER ============ */}
            <footer
                className="bg-white border-t border-slate-300 fixed bottom-0 left-0 right-0 z-40 shadow-lg
                           px-2.5 sm:px-4 md:px-8
                           pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
            >
                <div className="w-full max-w-[117rem] mx-auto flex items-center justify-between gap-2 sm:gap-4">
                    {/* Tombol Sebelumnya */}
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={isFirstSection || isSubmitting}
                        aria-label="Section Sebelumnya"
                        className={`
                            px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border transition-all shrink-0 whitespace-nowrap
                            ${isFirstSection || isSubmitting
                                ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-xs cursor-pointer'
                            }
                        `}
                    >
                        <svg className="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden xs:inline sm:inline">Sebelumnya</span>
                    </button>

                    {/* Progress (desktop/tablet) */}
                    <div className="flex-1 max-w-md hidden sm:flex flex-col items-center gap-1.5 min-w-0">
                        <div className="w-full flex justify-between text-xs font-semibold text-slate-600 gap-2">
                            <span className="truncate">Section {currentSectionIndex + 1} dari {totalSections}</span>
                            <span className="text-emerald-600 font-bold whitespace-nowrap">{progressPercentage}% Selesai</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Progress compact (mobile) — indikasi tetap ada di HP */}
                    <div className="flex sm:hidden flex-1 flex-col items-center gap-1 min-w-0 px-1">
                        <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
                            {currentSectionIndex + 1}/{totalSections} · <span className="text-emerald-600">{progressPercentage}%</span>
                        </span>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Tombol Selanjutnya / Selesai */}
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleActionClick}
                        aria-label={isLastSection ? 'Selesai dan Kirim' : 'Lanjut ke Section Berikutnya'}
                        className={`
                            px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap
                            ${isLastSection
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 cursor-pointer'
                            }
                        `}
                    >
                        <span>
                            {isSubmitting
                                ? 'Mengirim...'
                                : isLastSection
                                    ? (
                                        <>
                                            <span className="hidden xs:inline sm:inline">Selesai &amp; Kirim</span>
                                            <span className="inline xs:hidden sm:hidden">Kirim</span>
                                        </>
                                    )
                                    : (
                                        <>
                                            <span className="hidden xs:inline sm:inline">Selanjutnya</span>
                                            <span className="inline xs:hidden sm:hidden">Lanjut</span>
                                        </>
                                    )
                            }
                        </span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isLastSection ? 'M5 13l4 4L19 7' : 'M9 5l7 7-7 7'} />
                        </svg>
                    </button>
                </div>
            </footer>

            {/* ============ MODAL KONFIRMASI ============ */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6 text-center space-y-4 border border-slate-100 transform transition-all scale-100">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                            ⚠️
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-base font-bold text-slate-900">
                                Kirim Hasil Inspeksi?
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed px-1">
                                Pastikan data sudah benar. Jika terdapat temuan{' '}
                                <strong className="text-rose-600 font-semibold">abnormal</strong>, sistem akan{' '}
                                <strong className="text-slate-700">otomatis menerbitkan tiket eskalasi</strong>.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
                            >
                                Periksa Lagi
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? 'Mengirim...' : 'Ya, Kirim'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}