import React, { useState, useEffect, ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import FloatingQrButton from '../components/qr/FloatingQrButton';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AppLayoutProps {
    children: ReactNode;
}

interface User {
    id: number;
    role: string;
    full_name: string;
}

interface FlashMessages {
    success?: string;
    error?: string;
}

interface PageProps {
    auth: { user: User };
    flash?: FlashMessages;
    [key: string]: any;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const pageProps = usePage<PageProps>().props;
    const user = pageProps?.auth?.user;
    const { flash } = pageProps;

    const [scanAlertMessage, setScanAlertMessage] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', message: flash.success });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        } else if (flash?.error) {
            setToast({ type: 'error', message: flash.error });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isMobile && sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, sidebarOpen]);

    const toggleSidebar = () => {
        if (isMobile) setSidebarOpen(!sidebarOpen);
    };

    const navItems = [
        { label: 'Dashboard', url: '/dashboard', matchPrefix: '/dashboard', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
            </svg>
        )},
        { label: 'Manajemen User', url: '/users', matchPrefix: '/users', adminOnly: true, icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )},
        { label: 'Manajemen Mesin', url: '/machines', matchPrefix: '/machines', isMachineMenu: true, icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )},
        { label: 'Manajemen Formulir', url: '/forms', matchPrefix: '/forms', adminOnly: true, icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )},
        { label: 'Manajemen Schedule', url: '/schedules', matchPrefix: '/schedules', adminOnly: true, icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )},
        { label: 'Inspection Calender', url: '/inspection-calender', matchPrefix: '/inspection-calender', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        )},
        { label: 'Breakdown Pipeline', url: '/breakdowns', matchPrefix: '/breakdowns', icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )},
    ];

    const filterNavbar = navItems
        .filter((item: any) => (item.adminOnly ? user?.role === 'ADMIN' : true))
        .map((item: any) => {
            if (item.isMachineMenu && user?.role !== 'ADMIN') {
                return { ...item, label: 'Machine Profile' };
            }
            return item;
        });

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const handleGlobalQrScanSuccess = (decodedText: string) => {
        if (!decodedText) return;
        let scannedValue = decodedText.trim();

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

        const machineCode = scannedValue.trim().toUpperCase();
        router.visit(`/scan-task/${encodeURIComponent(machineCode)}`);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-xs font-semibold text-slate-500 animate-pulse">Memuat sesi pengguna...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
            {toast && (
                <div className="fixed z-[99999] pointer-events-none transition-all duration-300 bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 flex flex-col items-end">
                    <div className="pointer-events-auto bg-white text-slate-900 px-4 py-3.5 rounded-2xl shadow-2xl border border-slate-200/80 flex items-start gap-3 w-full sm:w-80 max-w-full">
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900">{toast.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed break-words">{toast.message}</p>
                        </div>
                        <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-40 shadow-md shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="lg:hidden w-10 h-10 border border-slate-700 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors shrink-0"
                        title="Buka Menu"
                        aria-label="Buka Menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 17h16" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-inner shrink-0">
                            MD
                        </div>
                        <div className="hidden sm:block min-w-0">
                            <strong className="block text-sm font-extrabold leading-tight text-white truncate max-w-[160px] sm:max-w-none">
                                PT. Lelco Trindo Nusantara
                            </strong>
                            <span className="block text-[11px] text-slate-400 truncate">Machine Digitalization</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="hidden md:flex items-center gap-2.5 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-400/30">
                            {user.full_name?.charAt(0)}
                        </div>
                        <div className="text-left leading-tight">
                            <span className="block text-xs font-bold text-slate-200 max-w-[140px] truncate">{user.full_name}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">{user.role}</span>
                        </div>
                    </div>

                    <div className="flex md:hidden w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs items-center justify-center border border-blue-400/30">
                        {user.full_name?.charAt(0)}
                    </div>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-2.5 sm:px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                    >
                        Keluar
                    </Link>
                </div>
            </header>

            <div className="flex flex-1 relative min-h-0 overflow-hidden">
    {/* Overlay mobile/tablet */}
    {isMobile && sidebarOpen && (
        <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-16 bg-slate-900/60 backdrop-blur-xs z-30 transition-opacity"
            aria-hidden="true"
        />
    )}

    {/* Sidebar */}
    <aside
        className={`
            bg-white border-r border-slate-200 flex flex-col p-3 shadow-lg lg:shadow-none
            /* ✅ Kunci agar sidebar full dari atas header sampai bawah layar */
            fixed top-16 bottom-0 left-0 z-30 w-64 max-w-[80vw] transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            
            /* Desktop */
            lg:sticky lg:top-0 lg:bottom-auto lg:h-[calc(100dvh-4rem)] lg:translate-x-0 lg:flex
        `}
    >
        <div className="py-2 px-1 border-b border-slate-100 flex items-center justify-between mb-3 shrink-0">
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase truncate">
                Menu Utama
            </span>
            {isMobile && (
                <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Tutup Menu"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* ✅ Beri overflow-y-auto khusus untuk list menu agar tidak mendorong footer */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {filterNavbar.map((item: any, idx: number) => {
                const isActive = currentPath.startsWith(item.matchPrefix);
                return (
                    <Link
                        key={idx}
                        href={item.url}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        title={item.label}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all overflow-hidden whitespace-nowrap
                            ${isActive
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }
                        `}
                    >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                    </Link>
                );
            })}
        </nav>

        {/* Footer Sidebar */}
        <div className="pt-3 pb-16 border-t border-slate-100 text-[10px] text-slate-400 shrink-0">
            <div className="px-1">
                <strong className="block text-slate-800 font-bold">System Maintenance v2.0</strong>
                <span>Laravel Inertia React SPA</span>
            </div>
        </div>
    </aside>

    {/* Main Content */}
    {/* ✅ Pastikan main content bisa di-scroll secara independen */}
    <main className="flex-1 min-w-0 overflow-y-auto h-[calc(100dvh-4rem)] p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-[117rem] mx-auto w-full pb-20">
            {children}
        </div>
    </main>
</div>
            <FloatingQrButton onScanSuccess={handleGlobalQrScanSuccess} />

            {scanAlertMessage && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600 font-black text-xl">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">Task Tidak Ditemukan</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 break-words">
                            {scanAlertMessage}
                        </p>
                        <div className="mt-5 space-y-2">
                            <button
                                type="button"
                                onClick={() => router.visit('/inspection-calender')}
                                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-sm"
                            >
                                Buka Halaman Kalender Task
                            </button>
                            <button
                                type="button"
                                onClick={() => setScanAlertMessage(null)}
                                className="w-full py-2 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}