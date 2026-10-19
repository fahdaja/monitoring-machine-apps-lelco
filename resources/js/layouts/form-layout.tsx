import { Link } from "@inertiajs/react";


export default function FormLayout({
    children,
    footer,
}: {
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
            {/* Topbar Header */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                            <span className="block text-[9px] text-slate-400">PT LELCO TRINDO NUSANTARA</span>
                            <strong className="block text-sm font-extrabold leading-tight text-white">
                                L1 Injection Molding
                            </strong>
                            <span className="block text-[9px] text-slate-400">FMNCINJ00001 Mesin Injection Super Master 350 Ton SN L1</span>
                        </div>
                    </div>
                </div>

                {/* User Info & Quick Action */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/machines"
                        className="text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-xl transition-colors"
                    >
                        Tutup
                    </Link>
                </div>  
            </header>

            {/* Isi Halaman (Diberi pb-20 agar konten bawah tidak tertutup footer) */}
            <div className="flex-1 pb-20 bg-slate-100">
                {children}
            </div>
            {footer && (
                <footer className="h-16 bg-white border-t border-slate-300 fixed bottom-0 left-0 right-0 z-40 px-4 md:px-8 flex items-center shadow-lg">
                    {footer}
                </footer>
            )}
        </div>
    );
}
