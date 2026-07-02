import axios from 'axios';
import API from '../services/api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum for AWS S3 multipart upload

/**
 * Uploads a large file directly to S3 via chunked multipart uploads.
 * @param {File} file The File object from the browser input.
 * @param {string} folder Destination folder prefix in S3.
 * @param {function} onProgress Optional progress callback receiving percent (0-100).
 * @returns {Promise<string>} The completed public S3 URL of the uploaded file.
 */
export async function uploadFileToS3(file, folder = 'media', onProgress = null) {
    if (!file) throw new Error('No file provided.');

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadId = null;
    let key = null;

    try {
        // 1. Initiate Multipart Upload via FataleCore backend
        const initiateRes = await API.Files.initiateMultipart(
            file.name,
            file.type || 'application/octet-stream',
            folder
        );
        uploadId = initiateRes.data.uploadId;
        key = initiateRes.data.key;

        const parts = [];
        let uploadedBytes = 0;

        // 2. Upload Chunks
        for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const chunkSize = end - start;

            // Fetch Presigned URL for this specific part from the backend
            const presignRes = await API.Files.getMultipartPresign(key, uploadId, partNumber);
            const presignedUrl = presignRes.data.url;

            // Upload chunk to S3 using a clean axios instance to avoid custom API interceptors/headers
            const response = await axios.put(presignedUrl, chunk, {
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const currentPartProgress = progressEvent.loaded;
                        const totalUploaded = uploadedBytes + currentPartProgress;
                        const percent = Math.min(Math.round((totalUploaded / file.size) * 100), 99); // Cap at 99% until complete
                        onProgress(percent);
                    }
                }
            });

            // Get ETag from response headers.
            const eTag = response.headers.etag;
            if (!eTag) {
                throw new Error(`S3 did not return an ETag for part ${partNumber}. Ensure CORS ExposeHeaders config on S3 includes ETag.`);
            }

            parts.push({
                partNumber,
                eTag: eTag.replace(/"/g, '') // Strip quotes from ETag header
            });

            uploadedBytes += chunkSize;
        }

        // 3. Complete Multipart Upload
        if (onProgress) onProgress(99);
        const completeRes = await API.Files.completeMultipart(key, uploadId, parts);
        if (onProgress) onProgress(100);

        return completeRes.data.path;

    } catch (error) {
        console.error('S3 Multipart Upload Failed:', error);
        // Abort the upload to clean up S3 storage if initiate was successful
        if (uploadId && key) {
            try {
                await API.Files.abortMultipart(key, uploadId);
            } catch (abortError) {
                console.error('Failed to abort S3 Multipart Upload:', abortError);
            }
        }
        throw error;
    }
}
