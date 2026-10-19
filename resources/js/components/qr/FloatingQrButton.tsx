import React, { useState, useEffect, useRef, PointerEvent } from 'react';

interface FloatingQrButtonProps {
    onScanSuccess?: (decodedText: string) => void;
}

interface Position {
    x: number;
    y: number;
}

export default function FloatingQrButton({ onScanSuccess }: FloatingQrButtonProps) {
    // 1. State Posisi Tombol (Default di kanan bawah)
    const [position, setPosition] = useState<Position>(() => {
        const saved = localStorage.getItem('md_qr_btn_pos_v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                // Ignore parse error
            }
        }
        return {
            x: window.innerWidth - 80,
            y: window.innerHeight - 100,
        };
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    
    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        hasMoved: false,
    });

    const html5QrCodeRef = useRef<any>(null);

    // Load Script HTML5-Qrcode CDN secara dinamis saat komponen dipasang
    useEffect(() => {
        if (!document.getElementById('html5-qrcode-script')) {
            const script = document.createElement('script');
            script.id = 'html5-qrcode-script';
            script.src = 'https://unpkg.com/html5-qrcode';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // 2. Event Handlers Dragging
    const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        const button = e.currentTarget;
        button.setPointerCapture(e.pointerId);

        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y,
            hasMoved: false,
        };

        setIsDragging(true);
    };

    const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
        if (!isDragging) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragRef.current.hasMoved = true;
        }

        if (!dragRef.current.hasMoved) return;

        const padding = 10;
        const buttonWidth = 60;
        const buttonHeight = 60;

        const maxX = window.innerWidth - buttonWidth - padding;
        const maxY = window.innerHeight - buttonHeight - padding;

        const newX = Math.min(maxX, Math.max(padding, dragRef.current.initialX + dx));
        const newY = Math.min(maxY, Math.max(padding, dragRef.current.initialY + dy));

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
        if (!isDragging) return;

        setIsDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {
            // Safe fallback
        }

        if (dragRef.current.hasMoved) {
            localStorage.setItem('md_qr_btn_pos_v2', JSON.stringify(position));
        } else {
            // Klik terdeteksi: Buka Modal Scanner Kamera
            openScanner();
        }
    };

    // Fungsi Membuka Kamera & Scanner
    const openScanner = () => {
        setIsScannerOpen(true);
        setScanResult(null);

        setTimeout(() => {
            // Pastikan library dari CDN sudah siap
            // @ts-ignore
            if (window.Html5Qrcode) {
                // @ts-ignore
                const scanner = new window.Html5Qrcode("reader-container");
                html5QrCodeRef.current = scanner;

                scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: 250 },
                    (decodedText: string) => {
                        setScanResult(decodedText);
                        // Matikan kamera setelah sukses
                        scanner.stop().then(() => {
                            setIsScannerOpen(false);
                            if (onScanSuccess) {
                                onScanSuccess(decodedText);
                            }
                        }).catch((err: any) => console.error(err));
                    },
                    (errorMessage: string) => {
                        // Error scan frame (biasanya diabaikan agar tidak spam console)
                    }
                ).catch((err: any) => {
                    console.error("Gagal membuka kamera:", err);
                    alert("Gagal mengakses kamera perangkat.");
                    setIsScannerOpen(false);
                });
            }
        }, 300);
    };

    // Fungsi Menutup Scanner Manual
    const closeScanner = () => {
        if (html5QrCodeRef.current) {
            html5QrCodeRef.current.stop().then(() => {
                setIsScannerOpen(false);
            }).catch(() => {
                setIsScannerOpen(false);
            });
        } else {
            setIsScannerOpen(false);
        }
    };

    return (
        <>
            {/* Tombol Floating */}
            <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    touchAction: 'none',
                }}
                className={`fixed z-50 flex items-center justify-center p-2 rounded-full shadow-2xl transition-shadow select-none ${
                    isDragging
                        ? 'cursor-grabbing bg-slate-950 scale-105 ring-4 ring-blue-500/30'
                        : 'cursor-grab bg-slate-900 hover:bg-slate-800'
                }`}
                title="Tarik untuk menggeser, klik untuk scan QR"
            >
                <div className="w-11 h-11 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-inner pointer-events-none">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                </div>
                <span className="text-xs font-extrabold text-white px-2.5 hidden sm:inline pointer-events-none">
                    Scan QR
                </span>
            </button>

            {/* Modal / Popup Kamera Scanner */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl flex flex-col items-center">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Arahkan Kamera ke QR Code</h3>
                        
                        {/* Wadah Tampilan Kamera dari Html5Qrcode */}
                        <div id="reader-container" className="w-full rounded-xl overflow-hidden bg-slate-100"></div>

                        {scanResult && (
                            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm w-full text-center font-medium">
                                Berhasil: {scanResult}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={closeScanner}
                            className="mt-5 w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                        >
                            Tutup Kamera
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}