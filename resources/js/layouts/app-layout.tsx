import React, { useState, useEffect, ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import FloatingQrButton from '../components/qr/FloatingQrButton';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const pageProps = usePage().props as any;
    const user = pageProps?.auth?.user || { name: 'Muhammad Fahd', role: 'Maintenance Admin' };
    const flash = pageProps?.flash || {};

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarPinned, setSidebarPinned] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => {
        if (isMobile) {
            setSidebarOpen(!sidebarOpen);
        } else {
            setSidebarPinned(!sidebarPinned);
            setSidebarOpen(!sidebarPinned);
        }
    };

    const navItems = [
        {
            label: 'Dashboard',
            url: '/dashboard',
            matchPrefix: '/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM14 13a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
                </svg>
            ),
        },
        {
            label: 'Manajemen User',
            url: '/management-users',
            matchPrefix: '/management-users',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
        {
            label: 'Manajemen Mesin',
            url: '/management-machines',
            matchPrefix: '/management-machines',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            label: 'Manajemen Formulir',
            url: '/management-forms',
            matchPrefix: '/management-forms',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: 'Inspection Tasks',
            url: '/inspection-tasks',
            matchPrefix: '/inspection-tasks',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            label: 'Breakdown Pipeline',
            url: '/breakdowns',
            matchPrefix: '/breakdowns',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        {  
            label: 'Machine Profile',
            url: '/machines',
            matchPrefix: '/machines',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
        },
    ];

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
            {/* Topbar Header */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="w-10 h-10 border border-slate-700 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors"
                        title="Toggle Menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 17h16" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm text-white shadow-inner">
                            MD
                        </div>
                        <div className="hidden sm:block">
                            <strong className="block text-sm font-extrabold leading-tight text-white">
                                PT. Lelco Trindo Nusantara
                            </strong>
                            <span className="block text-[11px] text-slate-400">Machine Digitalization</span>
                        </div>
                    </div>
                </div>

                {/* User Info & Quick Action */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2.5 bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-400/30">
                            {user.name.charAt(0)}
                        </div>
                        <div className="text-left leading-tight">
                            <span className="block text-xs font-bold text-slate-200">{user.name}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">{user.role}</span>
                        </div>
                    </div>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-xl transition-colors"
                    >
                        Keluar
                    </Link>
                </div>
            </header>

            <div className="flex flex-1 relative">
                {/* Overlay Backdrop Mobile */}
                {isMobile && sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 transition-opacity"
                    />
                )}

                {/* Sidebar Navigation */}
                <aside
                    onMouseEnter={() => !isMobile && !sidebarPinned && setSidebarOpen(true)}
                    onMouseLeave={() => !isMobile && !sidebarPinned && setSidebarOpen(false)}
                    className={`
                        fixed md:sticky top-16 bottom-0 left-0 z-30 bg-white border-r border-slate-200 transition-all duration-200 flex flex-col p-3 shadow-lg md:shadow-none h-[calc(100vh-4rem)]
                        ${isMobile ? (sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full') : (sidebarOpen || sidebarPinned ? 'w-64' : 'w-20')}
                    `}
                >
                    <div className="py-2 px-1 border-b border-slate-100 flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                            {sidebarOpen || sidebarPinned || isMobile ? 'Menu Utama' : 'Menu'}
                        </span>
                    </div>

                    <nav className="flex-1 space-y-1.5">
                        {navItems.map((item, idx) => {
                            const isActive = currentPath.startsWith(item.matchPrefix);
                            const isExpanded = sidebarOpen || sidebarPinned || isMobile;

                            return (
                                <Link
                                    key={idx}
                                    href={item.url}
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
                                    {isExpanded && <span className="truncate">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                        {(sidebarOpen || sidebarPinned || isMobile) && (
                            <div className="px-1">
                                <strong className="block text-slate-800 font-bold">System Maintenance v2.0</strong>
                                <span>Laravel Inertia React SPA</span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0">
                    {flash?.success && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                            {flash.error}
                        </div>
                    )}

                    {children}
                </main>
            </div>

          <FloatingQrButton 
    onScanSuccess={(decodedText) => {
        console.log("Hasil scan dari tombol floating:", decodedText);
        
        // Di sini kamu bisa kirim datanya ke backend Laravel atau lakukan sesuatu
        // Contoh: kirimDataKeLaravel(decodedText);
    }} 
/>
        </div>
    );
}