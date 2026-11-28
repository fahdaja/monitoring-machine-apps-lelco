import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/** Menit → "2 hari 3 jam 5 menit" (null/undefined → "-"). */
export function formatMinutes(minutes?: number | null): string {
    if (minutes === null || minutes === undefined) return '-';
    const m = Math.max(0, Math.round(Number(minutes)));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), min = m % 60;
    return [d && `${d} hari`, h && `${h} jam`, `${min} menit`].filter(Boolean).join(' ');
}
