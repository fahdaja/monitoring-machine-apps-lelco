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

    // Cari judul form dari relasi task->form atau langsung dari props form
    const formTitle = task?.form?.form_title || form?.form_title || 'Formulir Inspeksi';

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleActionClick = () => {
        if (isLastSection) {
            // Jika di section terakhir, jangan langsung kirim, tapi buka modal konfirmasi dulu
            setShowConfirmModal(true);
        } else {
            handleNext(); // Lanjut ke section berikutnya
        }
    };

    const handleConfirmSubmit = () => {
        setShowConfirmModal(false);
        if (onSubmitFinal) {
            onSubmitFinal(); // Eksekusi fungsi submit yang sebenarnya
        }
    };
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
            {/* Topbar Header */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                    <div>
                        <span className="block text-[9px] text-slate-400">PT LELCO TRINDO NUSANTARA</span>
                        <strong className="block text-sm font-extrabold leading-tight text-white">
                            {formTitle}
                        </strong>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/inspection-calender"
                        className="text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-xl transition-colors"
                    >
                        Tutup
                    </Link>
                </div>  
            </header>

            {/* Isi Halaman */}
            <div className="flex-1 pb-20 bg-slate-100">
                {children}
            </div>

            {/* Footer Navigasi */}
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
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-xs'
                            }
                        `}
                    >
                        <span>Sebelumnya</span>
                    </button>

                    {/* Progress Bar (Tengah) */}
                    <div className="flex-1 max-w-md hidden sm:flex flex-col items-center gap-1.5">
                        <div className="w-full flex justify-between text-xs font-semibold text-slate-600">
                            <span>Section {currentSectionIndex + 1} dari {totalSections}</span>
                            <span className="text-emerald-600 font-bold">{progressPercentage}% Selesai</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>

                 {/* Tombol Selanjutnya / Selesai & Kirim */}
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleActionClick}
                        className={`
                            px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50
                            ${isLastSection
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                            }
                        `}
                    >
                        <span>
                            {isSubmitting 
                                ? 'Mengirim...' 
                                : isLastSection 
                                    ? 'Selesai & Kirim' 
                                    : 'Selanjutnya'
                            }
                        </span>
                    </button>
                </div>
            </footer>
           {/* --- MODAL KONFIRMASI (SIMPLE, CENTERED, WITH WARNING) --- */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-100 transform transition-all scale-100">
                        
                        {/* Ikon Bulat Simpel */}
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                            ⚠️
                        </div>

                        {/* Teks / Informasi & Peringatan Abnormal */}
                        <div className="space-y-2">
                            <h3 className="text-base font-bold text-slate-900">
                                Kirim Hasil Inspeksi?
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed px-1">
                                Pastikan data sudah benar. Jika terdapat temuan <strong className="text-rose-600 font-semibold">abnormal</strong>, sistem akan <strong className="text-slate-700">otomatis menerbitkan tiket eskalasi</strong>.
                            </p>
                        </div>

                        {/* Tombol Aksi (Centered / Sejajar) */}
                        <div className="flex items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                            >
                                Periksa Lagi
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
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