import React, { useState } from 'react';
import CameraCapture from '@/components/camera-capture';
import { photoUrl } from '@/lib/photos';

interface Props {
    paths: string[];
    uploading?: boolean;
    onAdd: (file: File) => void;
    onRemove: (path: string) => void;
}

/** Field foto: banyak foto, hanya dari kamera (tanpa galeri). */
export default function PhotoField({ paths, uploading = false, onAdd, onRemove }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 cursor-pointer transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {uploading ? 'Mengunggah...' : paths.length > 0 ? 'Tambah Foto dengan Kamera' : 'Ambil Foto dengan Kamera'}
            </button>

            {paths.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {paths.map((p) => (
                        <div key={p} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={photoUrl(p)} alt="Foto evidence" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onRemove(p)}
                                aria-label="Hapus foto"
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold cursor-pointer"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {open && <CameraCapture onCapture={onAdd} onClose={() => setOpen(false)} />}
        </div>
    );
}
