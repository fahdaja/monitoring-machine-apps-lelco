import React, { useState, useEffect, useRef, PointerEvent } from 'react';

interface FloatingQrButtonProps {
    onScanSuccess?: (decodedText: string) => void;
}

interface Position {
    x: number;
    y: number;
}

export default function FloatingQrButton({ onScanSuccess }: FloatingQrButtonProps) {
    const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
    const [isClient, setIsClient] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        hasMoved: false,
    });

    const scannerInstanceRef = useRef<any>(null);

    // Perkiraan ukuran tombol (lebar & tinggi dalam pixel)
    const BUTTON_WIDTH = 110; 
    const BUTTON_HEIGHT = 60;
    const PADDING = 16; // Jarak aman dari pinggir layar

    // Fungsi utilitas untuk memastikan posisi tidak pernah keluar layar
    const clampPosition = (x: number, y: number) => {
        if (typeof window === 'undefined') return { x, y };
        
        const maxX = window.innerWidth - BUTTON_WIDTH - PADDING;
        const maxY = window.innerHeight - BUTTON_HEIGHT - PADDING;

        return {
            x: Math.min(Math.max(PADDING, x), Math.max(PADDING, maxX)),
            y: Math.min(Math.max(PADDING, y), Math.max(PADDING, maxY)),
        };
    };

    // 1. Load posisi dari localStorage & atur posisi awal / resize listener
    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('md_qr_btn_pos_v2');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Validasi agar posisi lama tidak di luar layar
                    setPosition(clampPosition(parsed.x, parsed.y));
                } catch (e) {
                    setPosition(clampPosition(window.innerWidth - BUTTON_WIDTH - 20, window.innerHeight - BUTTON_HEIGHT - 40));
                }
            } else {
                setPosition(clampPosition(window.innerWidth - BUTTON_WIDTH - 20, window.innerHeight - BUTTON_HEIGHT - 40));
            }

            // Handler jika ukuran layar berubah (misal rotasi HP / resize window)
            const handleResize = () => {
                setPosition((prev) => clampPosition(prev.x, prev.y));
            };

            window.addEventListener('resize', handleResize);

            // Inject script html5-qrcode ke dokumen jika belum ada
            // @ts-ignore
            if (!window.Html5Qrcode && !document.getElementById('html5-qrcode-cdn')) {
                const script = document.createElement('script');
                script.id = 'html5-qrcode-cdn';
                script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
                script.async = true;
                document.body.appendChild(script);
            }

            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, []);

    // Dragging Handlers
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

        // Hitung posisi baru berdasarkan pergerakan kursor/sentuhan
        const rawX = dragRef.current.initialX + dx;
        const rawY = dragRef.current.initialY + dy;

        // Batasi dengan fungsi clamp agar tidak bisa keluar layar saat digeser
        const clamped = clampPosition(rawX, rawY);
        setPosition(clamped);
    };

    const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (err) {}

        if (dragRef.current.hasMoved) {
            localStorage.setItem('md_qr_btn_pos_v2', JSON.stringify(position));
        } else {
            openScannerModal();
        }
    };

    // 🚀 Buka Scanner Modal & Inisialisasi Kamera
    const openScannerModal = () => {
        setIsScannerOpen(true);
        setErrorMessage(null);

        setTimeout(() => {
            // @ts-ignore
            const Html5Qrcode = window.Html5Qrcode;

            if (!Html5Qrcode) {
                setErrorMessage("Modul pemindai sedang dimuat. Coba beberapa saat lagi.");
                return;
            }

            const targetElement = document.getElementById("reader-target-box");
            if (!targetElement) {
                setErrorMessage("Container kamera belum siap.");
                return;
            }

            try {
                const scanner = new Html5Qrcode("reader-target-box");
                scannerInstanceRef.current = scanner;

                scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 280, height: 280 } },
                    (decodedText: string) => {
                        if (decodedText && decodedText.trim() !== "") {
                            scanner.stop().then(() => {
                                setIsScannerOpen(false);
                                scannerInstanceRef.current = null;
                                if (onScanSuccess) {
                                    onScanSuccess(decodedText.trim());
                                }
                            }).catch(() => {
                                setIsScannerOpen(false);
                                scannerInstanceRef.current = null;
                            });
                        }
                    },
                    (errorMessage: string) => {}
                ).catch((err: any) => {
                    setErrorMessage("Gagal mengakses kamera. Pastikan izin kamera diizinkan (Gunakan HTTPS atau Localhost).");
                });
            } catch (e) {
                setErrorMessage("Terjadi kesalahan saat membuka modul kamera.");
            }
        }, 400);
    };

    // 📸 Alternatif: Scan dari File Gambar / Galeri
    const handleScanFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // @ts-ignore
        const Html5Qrcode = window.Html5Qrcode;
        if (!Html5Qrcode) {
            alert("Modul belum siap.");
            return;
        }

        const html5QrCode = new Html5Qrcode("reader-target-box");
        html5QrCode.scanFile(file, true)
            .then((decodedText: string) => {
                setIsScannerOpen(false);
                if (scannerInstanceRef.current) {
                    try { scannerInstanceRef.current.clear(); } catch (e) {}
                    scannerInstanceRef.current = null;
                }
                if (decodedText && decodedText.trim() !== "") {
                    if (onScanSuccess) onScanSuccess(decodedText.trim());
                }
            })
            .catch((err: any) => {
                alert("QR Code tidak ditemukan atau tidak terbaca pada gambar tersebut.");
            });
    }; 

    // Tutup Scanner / Matikan Kamera
    const closeScannerModal = () => {
        const currentScanner = scannerInstanceRef.current;
        if (currentScanner) {
            try {
                currentScanner.stop().then(() => {
                    scannerInstanceRef.current = null;
                    setIsScannerOpen(false);
                }).catch(() => {
                    scannerInstanceRef.current = null;
                    setIsScannerOpen(false);
                });
            } catch (e) {
                scannerInstanceRef.current = null;
                setIsScannerOpen(false);
            }
        } else {
            setIsScannerOpen(false);
        }
    };

    if (!isClient) return null;

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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <span className="text-xs font-extrabold text-white px-2.5 hidden sm:inline pointer-events-none">
                    Scan QR
                </span>
            </button>

            {/* Modal Kamera & Scanner */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 relative shadow-2xl flex flex-col items-center">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Scan QR Code Mesin</h3>
                        
                        <div id="reader-target-box" className="w-full rounded-xl overflow-hidden bg-slate-100 min-h-[260px] relative"></div>

                        {errorMessage && (
                            <div className="mt-3 w-full bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                                <p className="text-[11px] text-rose-600 font-medium leading-relaxed">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <div className="mt-4 w-full flex flex-col gap-2">
                            <label className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl text-center cursor-pointer transition">
                                📁 Upload / Foto QR dari Galeri
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFromFile} />
                            </label>
                            
                            <button
                                type="button"
                                onClick={closeScannerModal}
                                className="w-full py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}