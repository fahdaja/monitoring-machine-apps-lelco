import React, { useEffect } from 'react';

interface ZoomOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    altText?: string;
    title?: string;
}

export default function ZoomOutModal({
    isOpen,
    onClose,
    imageSrc,
    altText = 'Preview Gambar',
    title,
}: ZoomOutModalProps) {
    // Menutup modal dengan tombol ESC keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Mencegah background scroll saat modal terbuka
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="relative max-w-5xl max-h-[90vh] flex flex-col items-center cursor-default"
                onClick={(e) => e.stopPropagation()} // Mencegah modal tertutup saat area gambar diklik
            >
                {/* Header Info / Tombol Tutup */}
                <div className="w-full flex items-center justify-between pb-3 text-white">
                    {title ? (
                        <span className="text-sm font-semibold truncate pr-4">{title}</span>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-slate-800/80 hover:bg-slate-700 text-white hover:text-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Tutup (Esc)
                    </button>
                </div>

                {/* Tampilan Gambar Zoom */}
                <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 flex items-center justify-center p-2">
                    <img
                        src={imageSrc}
                        alt={altText}
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
                    />
                </div>
            </div>
        </div>
    );
}