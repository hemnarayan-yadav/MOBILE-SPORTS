// Adapted from frontend/src/utils/mediaFile.js for an image picked on the phone
// (an expo-image-picker asset rather than a browser File). Images only: the
// app uploads profile photos so far.
//
// The file is uploaded exactly as the user picked it: no crop and no client-side
// processing, as on the web. The API checks everything again by file signature
// — this is the early, kind message, never the authority.

const MIME = Object.freeze({ JPEG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp' });
export const ACCEPTED_IMAGE_TYPES = Object.freeze([MIME.JPEG, MIME.PNG, MIME.WEBP]);

const BYTES_PER_MB = 1024 * 1024;
const EXTENSIONS = Object.freeze({ [MIME.JPEG]: 'jpg', [MIME.PNG]: 'png', [MIME.WEBP]: 'webp' });

export class MediaFileError extends Error {
  constructor(code, details) {
    super(code);
    this.name = 'MediaFileError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Turns a picked asset into the `{ uri, name, type }` React Native's FormData
 * uploads, refusing what the API would refuse anyway: an unsupported type
 * (e.g. HEIC) or a file over the limit from GET /media/config.
 */
export function uploadableImage(asset, { maxImageMb }) {
  const type = asset.mimeType;
  if (!ACCEPTED_IMAGE_TYPES.includes(type)) throw new MediaFileError('UNSUPPORTED_FILE_TYPE');
  if (asset.fileSize && asset.fileSize > maxImageMb * BYTES_PER_MB) {
    throw new MediaFileError('FILE_TOO_LARGE', { mb: maxImageMb });
  }
  return { uri: asset.uri, name: asset.fileName || `photo.${EXTENSIONS[type]}`, type };
}
