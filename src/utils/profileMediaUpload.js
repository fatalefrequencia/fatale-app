/** Max sizes before we reject or compress (mobile camera photos are often 5–15MB). */
export const PROFILE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PROFILE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
/** Safer cap for mobile uploads (cellular + Safari often drop larger bodies). */
export const PROFILE_VIDEO_MOBILE_MAX_BYTES = 25 * 1024 * 1024;

const isMobileDevice = () =>
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const API_BASE = () =>
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5264/api/').replace(/\/?$/, '/');

export function isBlobLike(value) {
    return (
        value != null &&
        typeof value === 'object' &&
        typeof value.size === 'number' &&
        value.size > 0
    );
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

async function parseErrorResponse(res) {
    try {
        const data = await res.json();
        return data?.message || data?.title || data?.error || JSON.stringify(data);
    } catch {
        return (await res.text()) || `Request failed (${res.status})`;
    }
}

function xhrSend(url, { method = 'POST', body, headers = {}, timeoutMs = 300000 }) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(headers).forEach(([key, value]) => {
            if (value != null) xhr.setRequestHeader(key, value);
        });
        xhr.timeout = timeoutMs;
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
                } catch {
                    resolve({});
                }
                return;
            }
            reject(new Error(xhr.responseText || `Request failed (${xhr.status})`));
        };
        xhr.onerror = () =>
            reject(
                new Error(
                    'Upload failed. Use Wi‑Fi or a shorter clip (under 25MB on mobile).'
                )
            );
        xhr.ontimeout = () =>
            reject(new Error('Upload timed out. Try a shorter video (under 25MB).'));
        xhr.send(body);
    });
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
    set('ThemeColor', formData.get('ThemeColor'));
    set('TextColor', formData.get('TextColor'));
    set('BackgroundColor', formData.get('BackgroundColor'));
    set('SecondaryColor', formData.get('SecondaryColor'));
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
 * Upload backdrop video directly on the profile endpoint via XHR POST.
 * iOS Safari often reports fetch "Load failed" on large File/upload requests.
 */
export async function uploadProfileVideo(formData, videoFile, userId, media = {}) {
    const body = new FormData();
    appendProfileFieldsToFormData(body, formData, media);
    body.append('WallpaperVideo', videoFile, videoFile.name || 'backdrop.mp4');
    body.append('BannerUrl', '');

    const headers = getSessionHeaders();
    if (userId != null && userId !== '') headers.UserId = String(userId);

    const url = `${API_BASE()}Users/update-profile`;
    const timeoutMs = isMobileDevice() ? 600000 : 300000;

    let data;
    try {
        data = await xhrSend(url, { method: 'POST', body, headers, timeoutMs });
    } catch (postErr) {
        try {
            data = await xhrSend(url, { method: 'PUT', body, headers, timeoutMs });
        } catch {
            throw postErr;
        }
    }

    return { data: data?.user ? data : { user: data } };
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
        themeColor: formData.get('ThemeColor') ?? '',
        ThemeColor: formData.get('ThemeColor') ?? '',
        textColor: formData.get('TextColor') ?? '',
        TextColor: formData.get('TextColor') ?? '',
        backgroundColor: formData.get('BackgroundColor') ?? '',
        BackgroundColor: formData.get('BackgroundColor') ?? '',
        secondaryColor: formData.get('SecondaryColor') ?? '',
        SecondaryColor: formData.get('SecondaryColor') ?? '',
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
 * JSON profile sync via fetch — iOS often breaks axios/fetch PUT + multipart.
 */
export async function syncProfileUpdate(payload, userId) {
    const headers = {
        ...getSessionHeaders(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
    if (userId != null && userId !== '') {
        headers.UserId = String(userId);
    }

    const url = `${API_BASE()}Users/update-profile`;
    const body = JSON.stringify(payload);

    let res = await fetch(url, { method: 'PUT', headers, body });

    if (!res.ok && (res.status === 405 || res.status === 404)) {
        res = await fetch(url, { method: 'POST', headers, body });
    }

    if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return { data: await res.json() };
    }
    return { data: {} };
}

/**
 * Last-resort: multipart POST with file blobs (when URL fields are not accepted).
 */
export async function syncProfileMultipart(formData, userId) {
    const headers = getSessionHeaders();
    if (userId != null && userId !== '') {
        headers.UserId = String(userId);
    }

    const url = `${API_BASE()}Users/update-profile`;
    let res = await fetch(url, { method: 'POST', body: formData, headers });

    if (!res.ok && res.status === 405) {
        res = await fetch(url, { method: 'PUT', body: formData, headers });
    }

    if (!res.ok) {
        throw new Error(await parseErrorResponse(res));
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return { data: await res.json() };
    }
    return { data: {} };
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
    if (!file?.type?.startsWith('video/')) return;
    const mobileCap = isMobileDevice();
    const limit = mobileCap ? PROFILE_VIDEO_MOBILE_MAX_BYTES : PROFILE_VIDEO_MAX_BYTES;
    if (file.size > limit) {
        throw new Error(
            mobileCap
                ? 'Video is too large for mobile upload. Please use a clip under 25MB.'
                : 'Video is too large. Please use a clip under 50MB.'
        );
    }
}
