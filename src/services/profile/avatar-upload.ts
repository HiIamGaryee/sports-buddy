import { env } from '@/config/env'
import {
  AVATAR_FILE_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_TRANSFORMATION,
} from '@/constants/profile-options'
import { isCloudinaryImageUrl } from '@/lib/safe-url'

const UPLOAD_FAILED_MESSAGE = "We couldn't upload your photo. Please try again."
const NOT_AN_IMAGE_MESSAGE = 'Choose a JPG, PNG or WebP image.'

const { cloudName, uploadPreset } = env.cloudinary

/** False when Cloudinary is not configured; the UI then offers no upload. */
export const isAvatarUploadConfigured = Boolean(cloudName && uploadPreset)

type AvatarFileType = (typeof AVATAR_FILE_TYPES)[number]

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end))

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * The file's REAL type, read from its first bytes. `file.type` comes from the
 * extension, so `payload.html` renamed to `photo.jpg` claims `image/jpeg`;
 * its bytes do not. SVG is never on this list: it is XML that can carry
 * script.
 */
function sniffImageType(bytes: Uint8Array): AvatarFileType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    return 'image/png'
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

const isAvatarFileType = (type: string): type is AvatarFileType =>
  (AVATAR_FILE_TYPES as readonly string[]).includes(type)

/**
 * Declared type AND content signature must both be an allowed image. Client
 * checks are bypassable, so the preset's allowed formats (Cloudinary) and the
 * response check in `readUploadedAvatarUrl` are the server-side half.
 */
export async function getAvatarFileError(file: File): Promise<string | null> {
  if (file.size === 0 || !isAvatarFileType(file.type)) return NOT_AN_IMAGE_MESSAGE
  if (file.size > AVATAR_MAX_BYTES) return 'Choose an image under 5 MB.'

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return sniffImageType(header) ? null : NOT_AN_IMAGE_MESSAGE
}

const UPLOADED_FORMATS: readonly string[] = ['jpg', 'png', 'webp']

/**
 * Cloudinary's response is untrusted too: it must describe an IMAGE in an
 * allowed format, at a URL inside our own cloud. Returns the delivery URL with
 * the avatar transform, which re-encodes the file on the way out.
 */
export function readUploadedAvatarUrl(
  data: unknown,
  expectedCloud: string,
): string | null {
  if (!data || typeof data !== 'object') return null
  const { resource_type, format, secure_url } = data as Record<string, unknown>

  if (resource_type !== 'image') return null
  if (typeof format !== 'string' || !UPLOADED_FORMATS.includes(format)) return null
  if (!isCloudinaryImageUrl(secure_url, expectedCloud)) return null

  return secure_url.replace(
    '/image/upload/',
    `/image/upload/${AVATAR_TRANSFORMATION}/`,
  )
}

/** Uploads through the unsigned preset. Call `getAvatarFileError` first. */
export async function uploadAvatar(file: File): Promise<string> {
  if (!cloudName || !uploadPreset) throw new Error(UPLOAD_FAILED_MESSAGE)

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', uploadPreset)

  let data: unknown
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body },
    )
    if (!response.ok) throw new Error(UPLOAD_FAILED_MESSAGE)
    data = await response.json()
  } catch {
    throw new Error(UPLOAD_FAILED_MESSAGE)
  }

  const url = readUploadedAvatarUrl(data, cloudName)
  if (!url) throw new Error(UPLOAD_FAILED_MESSAGE)
  return url
}
