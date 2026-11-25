import React, { useState, useEffect, useRef, PointerEvent } from 'react';
import { router } from '@inertiajs/react';

export interface QrScanTarget {
    expectedMachineCode: string;
    targetTaskId: number | string;
    machineName?: string;
    activity?: string;
}

export function triggerQrScanner(target?: QrScanTarget) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-qr-scanner', { detail: target || null }));
    }
}

export function extractMachineCodeFromQr(raw: string): string {
    let scannedValue = (raw || '').trim();
    if (!scannedValue) return '';

    if (scannedValue.includes('http://') || scannedValue.includes('https://')) {
        try {
            const urlObj = new URL(scannedValue);
            const segments = urlObj.pathname.split('/').filter(Boolean);
            scannedValue = segments[segments.length - 1] || scannedValue;
        } catch {
            scannedValue = scannedValue.split('/').pop() || scannedValue;
        }
    } else if (scannedValue.includes('/')) {
        scannedValue = scannedValue.split('/').pop() || scannedValue;
    }

    return scannedValue.trim().toUpperCase();
}

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
    const [isInsecureHttp, setIsInsecureHttp] = useState(false);
    const [scanTarget, setScanTarget] = useState<QrScanTarget | null>(null);
    const [copiedFlagUrl, setCopiedFlagUrl] = useState(false);

    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        hasMoved: false,
    });

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const scannerInstanceRef = useRef<any>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const hasHandledResultRef = useRef<boolean>(false);

    const PADDING = 16;

    const getButtonMetrics = () => {
        if (buttonRef.current) {
            return {
                width: buttonRef.current.offsetWidth || 60,
                height: buttonRef.current.offsetHeight || 60,
            };
        }
        const isSmall = typeof window !== 'undefined' && window.innerWidth < 640;
        return {
            width: isSmall ? 60 : 128,
            height: 60,
        };
    };

    const clampPosition = (x: number, y: number) => {
        if (typeof window === 'undefined') return { x, y };

        const { width, height } = getButtonMetrics();
        const maxX = window.innerWidth - width - PADDING;
        const maxY = window.innerHeight - height - PADDING;

        return {
            x: Math.min(Math.max(PADDING, x), Math.max(PADDING, maxX)),
            y: Math.min(Math.max(PADDING, y), Math.max(PADDING, maxY)),
        };
    };

    useEffect(() => {
        setIsClient(true);
        if (typeof window === 'undefined') return;

        setIsInsecureHttp(!window.isSecureContext);

        const { width: initW, height: initH } = getButtonMetrics();
        const saved = localStorage.getItem('md_qr_btn_pos_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setPosition(clampPosition(parsed.x, parsed.y));
            } catch {
                setPosition(clampPosition(window.innerWidth - initW - PADDING, window.innerHeight - initH - 40));
            }
        } else {
            setPosition(clampPosition(window.innerWidth - initW - PADDING, window.innerHeight - initH - 40));
        }

        const handleResize = () => {
            setPosition((prev) => clampPosition(prev.x, prev.y));
        };

        const handleExternalOpen = (e: Event) => {
            const customEvent = e as CustomEvent<QrScanTarget | null>;
            openScannerModal(customEvent.detail || null);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('open-qr-scanner', handleExternalOpen);

        // Fallback library html5-qrcode bila browser belum punya BarcodeDetector native
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
            window.removeEventListener('open-qr-scanner', handleExternalOpen);
            stopAllCameraStreams();
        };
    }, []);

    const stopAllCameraStreams = () => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach((track) => track.stop());
            videoStreamRef.current = null;
        }

        const currentScanner = scannerInstanceRef.current;
        if (currentScanner) {
            scannerInstanceRef.current = null;
            try {
                currentScanner.stop().catch(() => {});
            } catch {}
        }
    };

    const handleDecodedQr = (rawText: string, activeTarget: QrScanTarget | null) => {
        const cleanedCode = extractMachineCodeFromQr(rawText);
        if (!cleanedCode || hasHandledResultRef.current) return;

        if (activeTarget && activeTarget.expectedMachineCode) {
            const expected = activeTarget.expectedMachineCode.trim().toUpperCase();
            if (cleanedCode !== expected) {
                setErrorMessage(
                    `QR Code tidak cocok! Anda menscan "${cleanedCode}", sedangkan task ini untuk mesin "${expected}".`
                );
                return;
            }

            hasHandledResultRef.current = true;
            stopAllCameraStreams();
            setIsScannerOpen(false);
            router.visit(`/inspection-form/${activeTarget.targetTaskId}`);
            return;
        }

        hasHandledResultRef.current = true;
        stopAllCameraStreams();
        setIsScannerOpen(false);
        if (onScanSuccess) {
            onScanSuccess(cleanedCode);
        }
    };

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

        const clamped = clampPosition(dragRef.current.initialX + dx, dragRef.current.initialY + dy);
        setPosition(clamped);
    };

    const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}

        if (dragRef.current.hasMoved) {
            localStorage.setItem('md_qr_btn_pos_v2', JSON.stringify(position));
        } else {
            openScannerModal(null);
        }
    };

    /**
     * Fast-path 1: Native BarcodeDetector + HD getUserMedia
     * Jauh lebih cepat (<100ms) saat membaca QR di layar monitor & tidak butuh internet/CDN.
     */
    const startNativeFastScanner = async (container: HTMLElement, activeTarget: QrScanTarget | null): Promise<boolean> => {
        // @ts-ignore
        const BarcodeDetectorClass = typeof window !== 'undefined' ? window.BarcodeDetector : undefined;
        if (!BarcodeDetectorClass || !navigator.mediaDevices?.getUserMedia) {
            return false;
        }

        try {
            const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            videoStreamRef.current = stream;
            container.innerHTML = '';

            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', 'true');
            video.muted = true;
            video.className = 'w-full h-[260px] object-cover rounded-xl';
            container.appendChild(video);

            await video.play();

            let isDetecting = false;
            const tick = async () => {
                if (!videoStreamRef.current || hasHandledResultRef.current) return;

                if (!isDetecting && video.readyState >= 2) {
                    isDetecting = true;
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            handleDecodedQr(barcodes[0].rawValue, activeTarget);
                        }
                    } catch {
                        // Lanjut frame berikutnya
                    } finally {
                        isDetecting = false;
                    }
                }

                if (videoStreamRef.current && !hasHandledResultRef.current) {
                    rafIdRef.current = requestAnimationFrame(tick);
                }
            };

            rafIdRef.current = requestAnimationFrame(tick);
            return true;
        } catch {
            return false;
        }
    };

    const openScannerModal = (target: QrScanTarget | null = null) => {
        stopAllCameraStreams();
        hasHandledResultRef.current = false;
        setScanTarget(target);
        setIsScannerOpen(true);
        setErrorMessage(null);

        const insecure = typeof window !== 'undefined' && !window.isSecureContext;
        setIsInsecureHttp(insecure);

        setTimeout(async () => {
            const targetElement = document.getElementById('reader-target-box');
            if (!targetElement) return;

            if (insecure || !navigator.mediaDevices?.getUserMedia) {
                setErrorMessage(
                    'Browser memblokir akses live kamera di jaringan HTTP lokal. Gunakan HTTPS, localhost, atau aktifkan flag Chrome di bawah.'
                );
                return;
            }

            // 1. Coba Native BarcodeDetector (sangat cepat untuk layar monitor & 100% lokal)
            const nativeStarted = await startNativeFastScanner(targetElement, target);
            if (nativeStarted) return;

            // 2. Fallback ke Html5Qrcode dengan akselerasi BarcodeDetector & khusus format QR
            // @ts-ignore
            const Html5Qrcode = window.Html5Qrcode;
            if (!Html5Qrcode) {
                setErrorMessage('Modul pemindai kamera belum siap. Coba tutup dan buka kembali.');
                return;
            }

            try {
                const scanner = new Html5Qrcode('reader-target-box', {
                    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                    formatsToSupport: [0], // 0 = QR_CODE saja supaya tidak lambat mengecek 1D barcode
                    verbose: false,
                });
                scannerInstanceRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 25,
                        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.78);
                            return { width: Math.max(180, size), height: Math.max(180, size) };
                        },
                        disableFlip: false,
                    },
                    (decodedText: string) => {
                        if (decodedText && decodedText.trim() !== '') {
                            handleDecodedQr(decodedText, target);
                        }
                    },
                    () => {}
                );
            } catch {
                setErrorMessage('Gagal mengakses kamera. Pastikan izin kamera di browser telah diizinkan.');
            }
        }, 200);
    };

    const closeScannerModal = () => {
        stopAllCameraStreams();
        setIsScannerOpen(false);
        setScanTarget(null);
        setErrorMessage(null);
    };

    const copyOriginForChromeFlag = () => {
        if (typeof window === 'undefined') return;
        navigator.clipboard?.writeText(window.location.origin);
        setCopiedFlagUrl(true);
        setTimeout(() => setCopiedFlagUrl(false), 2500);
    };

    if (!isClient) return null;

    return (
        <>
            {/* Tombol Floating */}
            <button
                ref={buttonRef}
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
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 relative shadow-2xl flex flex-col items-center max-h-[92dvh] overflow-y-auto">
                        <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                            {scanTarget ? 'Verifikasi Scan QR Mesin' : 'Scan QR Code Mesin'}
                        </h3>

                        {scanTarget && (
                            <div className="w-full mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <p className="text-[11px] text-slate-500">
                                    Arahkan ke QR mesin:{' '}
                                    <strong className="font-mono text-slate-900">{scanTarget.expectedMachineCode}</strong>
                                </p>
                                {scanTarget.machineName && (
                                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{scanTarget.machineName}</p>
                                )}
                                {scanTarget.activity && (
                                    <p className="text-[11px] text-slate-500 truncate">{scanTarget.activity}</p>
                                )}
                            </div>
                        )}

                        <div
                            id="reader-target-box"
                            className="w-full rounded-xl overflow-hidden bg-slate-900 min-h-[240px] relative flex items-center justify-center text-xs text-slate-400"
                        >
                            {isInsecureHttp ? 'Mode HTTP Lokal Aktif' : 'Menyiapkan kamera...'}
                        </div>

                        {errorMessage && (
                            <div className="mt-3 w-full bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                                <p className="text-[11px] text-rose-600 font-semibold leading-relaxed">{errorMessage}</p>
                            </div>
                        )}

                        <div className="mt-3.5 w-full flex flex-col gap-2">
                            {isInsecureHttp && (
                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-1.5">
                                    <p className="text-[10px] font-bold text-amber-900">
                                        Tips Live Kamera di Jaringan HTTP Lokal:
                                    </p>
                                    <p className="text-[10px] text-amber-800 leading-relaxed">
                                        Buka <code className="font-mono bg-white px-1 py-0.5 rounded">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> di Chrome HP, tempel URL server ini lalu pilih <strong>Enabled</strong>.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={copyOriginForChromeFlag}
                                        className="w-full py-1.5 px-2.5 text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                                    >
                                        {copiedFlagUrl ? '✓ URL Server Disalin!' : `Salin URL Server (${typeof window !== 'undefined' ? window.location.origin : ''})`}
                                    </button>
                                </div>
                            )}

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
