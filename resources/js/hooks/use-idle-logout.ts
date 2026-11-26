import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit
const CHECK_INTERVAL_MS = 15 * 1000;
const STORAGE_KEY = 'lelco_last_activity_at';

/**
 * Auto-logout global jika user tidak melakukan aktivitas selama 10 menit.
 * Menggunakan localStorage agar aktivitas di tab lain tetap tersinkronisasi.
 */
export function useIdleLogout(enabled = true, userRole?: string) {
    const loggingOutRef = useRef(false);
    const loginPath = String(userRole || '').toUpperCase() === 'ADMIN' ? '/admin/login' : '/login';

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        const now = Date.now();
        let lastRecorded = now;
        try {
            window.localStorage.setItem(STORAGE_KEY, String(now));
        } catch {
            // abaikan jika storage diblokir
        }

        const markActivity = () => {
            const current = Date.now();
            if (current - lastRecorded < 1000) return;
            lastRecorded = current;
            try {
                window.localStorage.setItem(STORAGE_KEY, String(current));
            } catch {
                // abaikan
            }
        };

        const events: (keyof WindowEventMap)[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'touchstart',
            'scroll',
            'click',
        ];

        events.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

        const interval = window.setInterval(() => {
            if (loggingOutRef.current) return;

            let lastActivity = lastRecorded;
            try {
                const stored = Number(window.localStorage.getItem(STORAGE_KEY));
                if (stored && !Number.isNaN(stored)) {
                    lastActivity = Math.max(lastActivity, stored);
                }
            } catch {
                // gunakan lastRecorded
            }

            if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
                loggingOutRef.current = true;
                router.post(
                    '/logout',
                    {},
                    {
                        onError: () => {
                            window.location.href = loginPath;
                        },
                        onFinish: () => {
                            // Pastikan pindah ke halaman login sesuai portal walau sesi sudah kedaluwarsa di server
                            if (window.location.pathname !== loginPath) {
                                window.location.href = loginPath;
                            }
                        },
                    }
                );
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
            events.forEach((evt) => window.removeEventListener(evt, markActivity));
        };
    }, [enabled, loginPath]);
}
