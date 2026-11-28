/**
 * Nilai foto bisa berupa path tunggal (data lama), JSON array string, atau array.
 * Dikirim ke server sebagai JSON array string supaya tetap kompatibel dengan field string.
 */
export function parsePhotos(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    }

    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
        try {
            return parsePhotos(JSON.parse(trimmed));
        } catch {
            return [trimmed];
        }
    }

    return [trimmed];
}

export function encodePhotos(list: string[]): string {
    return list.length === 0 ? '' : JSON.stringify(list);
}

export function photoUrl(path: string): string {
    return path.startsWith('http') || path.startsWith('/') ? path : `/storage/${path}`;
}
