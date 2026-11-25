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
