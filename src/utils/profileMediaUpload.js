/** Max sizes before we reject or compress (mobile camera photos are often 5–15MB). */
export const PROFILE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PROFILE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function extractUploadedPath(data) {
    if (!data) return null;
    return (
        data.path ||
        data.Path ||
        data.url ||
        data.Url ||
        data.imageUrl ||
        data.ImageUrl ||
        data.filePath ||
        data.FilePath ||
        null
    );
}

/**
 * Resize/compress large photos so mobile uploads stay under proxy limits.
 * Skips GIF/video and images that are already small enough.
 */
export function compressImageForUpload(
    file,
    { maxWidth = 1920, maxHeight = 1920, maxBytes = 2 * 1024 * 1024, quality = 0.82 } = {}
) {
    if (!file?.type?.startsWith('image/') || file.type === 'image/gif') {
        return Promise.resolve(file);
    }
    if (file.size <= maxBytes) {
        return Promise.resolve(file);
    }

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    const name = file.name.replace(/\.[^.]+$/, '') || 'profile';
                    resolve(new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

export async function uploadProfileMediaFile(api, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.Files.upload(formData);
    const path = extractUploadedPath(res.data);
    if (!path) {
        throw new Error('Upload completed but the server did not return a file path.');
    }
    return path;
}

export async function prepareProfileImageFile(file) {
    if (!file?.type?.startsWith('image/')) return file;
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
        const compressed = await compressImageForUpload(file, { maxBytes: 2 * 1024 * 1024 });
        if (compressed.size > PROFILE_IMAGE_MAX_BYTES) {
            throw new Error('Image is too large. Try a smaller photo (under 8MB).');
        }
        return compressed;
    }
    return compressImageForUpload(file);
}

export function assertVideoSize(file) {
    if (file?.type?.startsWith('video/') && file.size > PROFILE_VIDEO_MAX_BYTES) {
        throw new Error('Video is too large. Please use a clip under 50MB.');
    }
}
