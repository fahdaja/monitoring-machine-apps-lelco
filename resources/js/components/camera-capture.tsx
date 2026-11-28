import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
    onCapture: (file: File) => void;
    onClose: () => void;
}

const MAX_SIDE = 1600;

/**
 * Kamera in-app (getUserMedia). Sengaja tanpa fallback ke galeri:
 * foto evidence hanya boleh diambil langsung dari kamera. Butuh HTTPS.
 */
export default function CameraCapture({ onCapture, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facing, setFacing] = useState<'environment' | 'user'>('environment');
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(0);

    const stop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const start = useCallback(async (mode: 'environment' | 'user') => {
        stop();
        setError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Kamera tidak tersedia. Pastikan aplikasi dibuka lewat HTTPS dan browser mendukung kamera.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: mode } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
        } catch {
            setError('Izinkan akses kamera untuk mengambil foto.');
        }
    }, []);

    useEffect(() => {
        start(facing);
        return stop;
    }, [facing, start]);

    const shoot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
                setCount((c) => c + 1);
            },
            'image/jpeg',
            0.8,
        );
    };

    const close = () => {
        stop();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="flex-1 relative min-h-0">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-white">
                        {error}
                    </div>
                ) : (
                    <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
                )}
                {count > 0 && (
                    <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
                        {count} foto diambil
                    </span>
                )}
            </div>
            <div className="p-4 flex items-center justify-between gap-3 bg-black">
                <button
                    type="button"
                    onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                    className="px-4 py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold cursor-pointer"
                >
                    Ganti Kamera
                </button>
                <button
                    type="button"
                    onClick={shoot}
                    disabled={!!error}
                    aria-label="Ambil foto"
                    className="w-16 h-16 rounded-full bg-white border-4 border-slate-400 disabled:opacity-40 cursor-pointer"
                />
                <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                    Selesai
                </button>
            </div>
        </div>
    );
}
