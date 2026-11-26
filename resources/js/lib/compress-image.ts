/**
 * Kompres gambar di sisi browser menggunakan Canvas agar ukuran selalu < maxSizeMB
 * sambil menjaga ketajaman visual (resolusi hingga 1920px, kualitas JPEG adaptif).
 */
export async function compressQuestionImage(
    file: File,
    maxSizeMB = 4.5,
    maxDimension = 1920
): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return file;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;

    // Jika file sudah kecil (< 1MB), tetap cek dimensi; kalau <= maxDimension langsung pakai aslinya
    const img = await loadImageFromFile(file);
    const { width, height } = img;

    if (file.size <= 1024 * 1024 && width <= maxDimension && height <= maxDimension) {
        return file;
    }

    let targetW = width;
    let targetH = height;
    if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        targetW = Math.round(width * ratio);
        targetH = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return file;
    }

    // Isi background putih untuk PNG transparan saat dikonversi ke JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Turunkan kualitas bertahap hanya jika masih di atas batas maxBytes
    const qualities = [0.88, 0.82, 0.75, 0.68, 0.6];
    let bestBlob: Blob | null = null;

    for (const q of qualities) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', q);
        if (!blob) continue;
        bestBlob = blob;
        if (blob.size <= maxBytes) {
            break;
        }
    }

    if (!bestBlob) {
        return file;
    }

    // Jika hasil kompresi ternyata lebih besar dari file asli (dan file asli sudah < maxBytes), pakai asli
    if (bestBlob.size >= file.size && file.size <= maxBytes) {
        return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([bestBlob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
}

/**
 * Kompres foto evidence / upload inspeksi otomatis agar ukuran selalu < 300 KB.
 * Menggunakan WebP (fallback JPEG) dengan resize adaptif (maks 1280px -> 960px jika masih besar).
 */
export async function compressEvidenceImage(
    file: File,
    maxSizeKB = 290,
    maxDimension = 1280
): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        return file;
    }

    const maxBytes = maxSizeKB * 1024;
    const img = await loadImageFromFile(file);
    const { width, height } = img;

    if (file.size <= maxBytes && width <= maxDimension && height <= maxDimension) {
        return file;
    }

    const tryCompress = async (dim: number, mimeType: string, qualities: number[]): Promise<Blob | null> => {
        let targetW = width;
        let targetH = height;
        if (width > dim || height > dim) {
            const ratio = Math.min(dim / width, dim / height);
            targetW = Math.round(width * ratio);
            targetH = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let best: Blob | null = null;
        for (const q of qualities) {
            const blob = await canvasToBlob(canvas, mimeType, q);
            if (!blob) continue;
            best = blob;
            if (blob.size <= maxBytes) break;
        }
        return best;
    };

    // Coba WebP dulu (jauh lebih kecil), fallback ke JPEG jika browser tidak support WebP encode
    let mimeType = 'image/webp';
    let ext = 'webp';
    let bestBlob = await tryCompress(maxDimension, mimeType, [0.82, 0.72, 0.62, 0.52, 0.42]);

    if (!bestBlob || bestBlob.type !== 'image/webp') {
        mimeType = 'image/jpeg';
        ext = 'jpg';
        bestBlob = await tryCompress(maxDimension, mimeType, [0.8, 0.7, 0.6, 0.5, 0.4]);
    }

    // Jika masih > maxBytes (misal foto sangat detail), perkecil dimensi ke 960px lalu 720px
    if (bestBlob && bestBlob.size > maxBytes) {
        const smaller = await tryCompress(960, mimeType, [0.65, 0.55, 0.45]);
        if (smaller && smaller.size < bestBlob.size) bestBlob = smaller;
    }
    if (bestBlob && bestBlob.size > maxBytes) {
        const smallest = await tryCompress(720, mimeType, [0.55, 0.45, 0.35]);
        if (smallest && smallest.size < bestBlob.size) bestBlob = smallest;
    }

    if (!bestBlob || (bestBlob.size >= file.size && file.size <= maxBytes)) {
        return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([bestBlob], `${baseName}.${ext}`, {
        type: mimeType,
        lastModified: Date.now(),
    });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });
}
