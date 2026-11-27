import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

const CORE_REALTIME_PREFIXES = [
    '/dashboard',
    '/inspection-calender',
    '/breakdowns',
    '/machines',
    '/schedules',
];

const POLL_INTERVAL_MS = 5 * 1000; // 5 detik

/**
 * Sinkronisasi data otomatis (real-time) untuk halaman core aplikasi tanpa perlu refresh manual.
 * Menunda reload saat user sedang mengetik di input atau membuka modal agar tidak mengganggu interaksi.
 */
export function useRealtimeSync(currentUrl: string) {
    const isReloadingRef = useRef(false);
    const lastReloadAtRef = useRef(Date.now());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const path = (currentUrl || window.location.pathname).split('?')[0];
        const isCorePage = CORE_REALTIME_PREFIXES.some(
            (prefix) => path === prefix || path.startsWith(`${prefix}/`)
        );

        // Jangan polling pada halaman create/edit form master agar input user tidak terganggu
        const isEditOrCreatePage = path.endsWith('/create') || path.endsWith('/edit');
        if (!isCorePage || isEditOrCreatePage) return;

        const isUserBusy = () => {
            if (document.visibilityState !== 'visible') return true;

            const active = document.activeElement;
            if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
                return true;
            }

            // Jangan reload saat modal/dialog sedang terbuka
            if (document.querySelector('[role="dialog"], .fixed.inset-0.z-50')) {
                return true;
            }

            return false;
        };

        const triggerReload = () => {
            if (isReloadingRef.current || isUserBusy()) return;
            isReloadingRef.current = true;
            lastReloadAtRef.current = Date.now();

            router.reload({
                onFinish: () => {
                    isReloadingRef.current = false;
                },
            });
        };

        const interval = window.setInterval(triggerReload, POLL_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastReloadAtRef.current > 5000) {
                triggerReload();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentUrl]);
}
