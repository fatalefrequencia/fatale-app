/** Max sizes before we reject or compress (mobile camera photos are often 5–15MB). */
export const PROFILE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PROFILE_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export function formatFileSizeMb(bytes) {
    return ((bytes || 0) / (1024 * 1024)).toFixed(1);
}

/** iOS often leaves `file.type` empty for .mov — also check extension. */
export function isVideoFile(file) {
    if (!file) return false;
    if (file.type?.startsWith('video/')) return true;
    return /\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name || '');
}

export function normalizeVideoFile(file) {
    if (!file) return file;
    if (file.type?.startsWith('video/')) return file;
    const name = file.name || 'backdrop.mp4';
    const ext = (name.split('.').pop() || 'mp4').toLowerCase();
    const mime = {
        mov: 'video/quicktime',
        mp4: 'video/mp4',
        m4v: 'video/mp4',
        webm: 'video/webm',
    }[ext] || 'video/mp4';
    const safeName = name.includes('.') ? name : `${name}.mp4`;
    return new File([file], safeName, { type: mime, lastModified: file.lastModified ?? Date.now() });
}

const API_BASE = () => {
    const raw = import.meta.env.VITE_API_BASE_URL || '/api/';
    if (raw.startsWith('http')) return raw.replace(/\/?$/, '/');
    // Same-origin relative path (proxied in prod via _redirects, vite in dev)
    const base = raw.startsWith('/') ? raw : `/${raw}`;
    return base.replace(/\/?$/, '/');
};

export function isBlobLike(value) {
    return (
        value != null &&
        typeof value === 'object' &&
        typeof value.size === 'number' &&
        value.size > 0
    );
}

/** Backend expects hex colors — CSS vars like var(--text-color) break profile sync. */
export function sanitizeColor(value, fallback = 'rgb(var(--theme-primary))') {
    const str = String(value ?? '').trim();
    if (!str || str.includes('var(') || str.includes('calc(')) return fallback;
    return str;
}

function getSessionHeaders() {
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const rawId = user?.id ?? user?.Id ?? user?.userId ?? user?.UserId;
        if (rawId != null && rawId !== '' && rawId !== 'undefined') {
            headers.UserId = String(rawId);
        }
    } catch {
        /* ignore */
    }
    return headers;
}

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

function formatAxiosError(err, step) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const detail =
        data?.message ||
        data?.title ||
        data?.error ||
        (typeof data === 'string' ? data : null) ||
        (data ? JSON.stringify(data) : null) ||
        err?.message ||
        'Unknown error';
    return `${step}${status ? ` (HTTP ${status})` : ''}: ${detail}`;
}

async function parseErrorResponse(res) {
    try {
        const data = await res.json();
        return data?.message || data?.title || data?.error || JSON.stringify(data);
    } catch {
        return (await res.text()) || `Request failed (${res.status})`;
    }
}

async function getApiClient() {
    return (await import('../services/api')).default;
}

/**
 * Native fetch upload for images — small files only.
 */
export async function uploadProfileMediaFile(file) {
    if (file?.type?.startsWith('video/')) {
        throw new Error('Use uploadProfileVideo instead of generic file upload for video.');
    }

    const formData = new FormData();
    formData.append('file', file, file.name || 'profile.jpg');

    const res = await fetch(`${API_BASE()}File/upload`, {
        method: 'POST',
        body: formData,
        headers: getSessionHeaders(),
    });

    if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
    }

    const data = await res.json();
    const path = extractUploadedPath(data);
    if (!path) {
        throw new Error('Upload completed but the server did not return a file path.');
    }
    return path;
}

function buildVideoMultipartBody(formData, videoFile, media = {}) {
    const file = normalizeVideoFile(videoFile);
    const body = new FormData();
    appendProfileFieldsToFormData(body, formData, { ...media, bannerUrl: '' });
    body.append('WallpaperVideo', file, file.name);
    body.append('BannerUrl', '');
    return body;
}

/** Append all profile fields to multipart FormData (PascalCase for .NET form binding). */
export function appendProfileFieldsToFormData(target, formData, media = {}) {
    const set = (key, val) => {
        if (val !== undefined && val !== null) {
            target.append(key, typeof val === 'boolean' ? String(val) : val);
        }
    };

    set('Username', formData.get('Username'));
    set('Biography', formData.get('Biography'));
    set('StatusMessage', formData.get('StatusMessage'));
    set('ResidentSectorId', formData.get('ResidentSectorId'));
    set('IsLive', formData.get('IsLive'));
    set('ThemeColor', sanitizeColor(formData.get('ThemeColor'), 'rgb(var(--theme-primary))'));
    set('TextColor', sanitizeColor(formData.get('TextColor'), '#ffffff'));
    set('BackgroundColor', sanitizeColor(formData.get('BackgroundColor'), '#000000'));
    set('SecondaryColor', sanitizeColor(formData.get('SecondaryColor'), 'rgb(var(--theme-secondary))'));
    set('IsGlass', formData.get('IsGlass'));
    set('InstagramUrl', formData.get('InstagramUrl'));
    set('TwitterUrl', formData.get('TwitterUrl'));
    set('YoutubeUrl', formData.get('YoutubeUrl'));
    set('WebsiteUrl', formData.get('WebsiteUrl'));

    const featuredRaw = formData.get('FeaturedTrackId');
    const featuredId = parseInt(featuredRaw, 10);
    if (!isNaN(featuredId) && featuredId > 0) {
        set('FeaturedTrackId', featuredId);
    }

    if (media.profilePictureUrl != null) set('ProfilePictureUrl', media.profilePictureUrl);
    if (media.bannerUrl != null) set('BannerUrl', media.bannerUrl);
    if (media.wallpaperVideoUrl != null) set('WallpaperVideoUrl', media.wallpaperVideoUrl);
}

/**
 * Video backdrop upload — tries axios strategies (same stack as community image uploads).
 */
export async function uploadProfileVideo(formData, videoFile, userId, media = {}) {
    const API = await getApiClient();
    const file = normalizeVideoFile(videoFile);
    assertVideoSize(file);

    const mergedMedia = { ...media, bannerUrl: '', wallpaperVideoUrl: '' };
    const errors = [];

    const attempts = [
        {
            step: 'Direct video upload (POST)',
            run: () => API.Users.updateProfilePost(buildVideoMultipartBody(formData, file, mergedMedia), userId),
        },
        {
            step: 'Direct video upload (PUT)',
            run: () => API.Users.updateProfile(buildVideoMultipartBody(formData, file, mergedMedia), userId),
        },
        {
            step: 'Storage upload + profile sync',
            run: async () => {
                const fd = new FormData();
                fd.append('file', file, file.name);
                const uploadRes = await API.Files.upload(fd);
                const path = extractUploadedPath(uploadRes.data);
                if (!path) throw new Error('Server did not return a video path.');
                const payload = buildProfileUpdatePayload(formData, {
                    ...mergedMedia,
                    wallpaperVideoUrl: path,
                });
                return API.Users.updateProfile(payload, userId);
            },
        },
    ];

    for (const attempt of attempts) {
        try {
            return await attempt.run();
        } catch (err) {
            console.warn(`[Profile] ${attempt.step} failed:`, err);
            errors.push(formatAxiosError(err, attempt.step));
        }
    }

    throw new Error(
        errors.length
            ? errors.join(' · ')
            : 'Video backdrop upload failed. Try converting the clip to MP4 and upload again.'
    );
}

/**
 * Build JSON payload for profile update (camelCase + PascalCase for .NET compatibility).
 */
export function buildProfileUpdatePayload(formData, media = {}) {
    const isLiveRaw = formData.get('IsLive');
    const isLive =
        isLiveRaw === true ||
        isLiveRaw === 'true' ||
        isLiveRaw === 'True' ||
        isLiveRaw === 1 ||
        isLiveRaw === '1';

    const isGlassRaw = formData.get('IsGlass');
    const isGlass =
        isGlassRaw === true ||
        isGlassRaw === 'true' ||
        isGlassRaw === 'True' ||
        isGlassRaw === 1 ||
        isGlassRaw === '1';

    const themeColor = sanitizeColor(formData.get('ThemeColor'), 'rgb(var(--theme-primary))');
    const textColor = sanitizeColor(formData.get('TextColor'), '#ffffff');
    const backgroundColor = sanitizeColor(formData.get('BackgroundColor'), '#000000');
    const secondaryColor = sanitizeColor(formData.get('SecondaryColor'), 'rgb(var(--theme-secondary))');

    const payload = {
        username: formData.get('Username') ?? '',
        Username: formData.get('Username') ?? '',
        biography: formData.get('Biography') ?? '',
        Biography: formData.get('Biography') ?? '',
        statusMessage: formData.get('StatusMessage') ?? '',
        StatusMessage: formData.get('StatusMessage') ?? '',
        residentSectorId: parseInt(formData.get('ResidentSectorId'), 10) || 0,
        ResidentSectorId: parseInt(formData.get('ResidentSectorId'), 10) || 0,
        isLive,
        IsLive: isLive,
        themeColor,
        ThemeColor: themeColor,
        textColor,
        TextColor: textColor,
        backgroundColor,
        BackgroundColor: backgroundColor,
        secondaryColor,
        SecondaryColor: secondaryColor,
        isGlass,
        IsGlass: isGlass,
        instagramUrl: formData.get('InstagramUrl') ?? '',
        InstagramUrl: formData.get('InstagramUrl') ?? '',
        twitterUrl: formData.get('TwitterUrl') ?? '',
        TwitterUrl: formData.get('TwitterUrl') ?? '',
        youtubeUrl: formData.get('YoutubeUrl') ?? '',
        YoutubeUrl: formData.get('YoutubeUrl') ?? '',
        websiteUrl: formData.get('WebsiteUrl') ?? '',
        WebsiteUrl: formData.get('WebsiteUrl') ?? '',
    };

    const featuredRaw = formData.get('FeaturedTrackId');
    const featuredId = parseInt(featuredRaw, 10);
    if (!isNaN(featuredId) && featuredId > 0) {
        payload.featuredTrackId = featuredId;
        payload.FeaturedTrackId = featuredId;
    }

    if (media.profilePictureUrl != null) {
        payload.profilePictureUrl = media.profilePictureUrl;
        payload.ProfilePictureUrl = media.profilePictureUrl;
    }
    if (media.bannerUrl != null) {
        payload.bannerUrl = media.bannerUrl;
        payload.BannerUrl = media.bannerUrl;
    }
    if (media.wallpaperVideoUrl != null) {
        payload.wallpaperVideoUrl = media.wallpaperVideoUrl;
        payload.WallpaperVideoUrl = media.wallpaperVideoUrl;
    }

    return payload;
}

/**
 * JSON profile sync via fetch — used for photo-only updates.
 */
export async function syncProfileUpdate(payload, userId) {
    const API = await getApiClient();
    return API.Users.updateProfile(payload, userId);
}

/**
 * Last-resort: multipart POST with file blobs (when URL fields are not accepted).
 */
export async function syncProfileMultipart(formData, userId) {
    const API = await getApiClient();
    try {
        return await API.Users.updateProfilePost(formData, userId);
    } catch {
        return API.Users.updateProfile(formData, userId);
    }
}

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
                    const name = file.name?.replace(/\.[^.]+$/, '') || 'profile';
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
    if (!isVideoFile(file)) return;
    if (file.size > PROFILE_VIDEO_MAX_BYTES) {
        throw new Error(
            `This video is ${formatFileSizeMb(file.size)}MB. Please use a clip under ${formatFileSizeMb(PROFILE_VIDEO_MAX_BYTES)}MB.`
        );
    }
}
