/**
 * Validation for a share-card background photo.
 *
 * The photo NEVER leaves the device: it is read into an object URL, drawn onto
 * the export canvas and revoked. Nothing is uploaded, nothing reaches Firebase
 * or Firestore, and nothing is written to the user's profile.
 */

export const ACCEPTED_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Matches `ACCEPTED_PHOTO_TYPES`, for the file input's `accept`. */
export const PHOTO_ACCEPT_ATTRIBUTE = ACCEPTED_PHOTO_TYPES.join(',')

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

const MAX_PHOTO_LABEL = '10 MB'

export type PhotoRejection = 'type' | 'size' | 'empty'

/**
 * `null` when the file is usable, otherwise why it was refused. A file picker
 * accepts anything a determined user renames, so the type is checked here too
 * rather than trusting the `accept` attribute.
 */
export function getPhotoRejection(file: File | null | undefined): PhotoRejection | null {
  if (!file || file.size === 0) return 'empty'
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > MAX_PHOTO_BYTES) return 'size'
  return null
}

/** A fixed, human message — never the file name or a library error. */
export function getPhotoErrorMessage(rejection: PhotoRejection): string {
  if (rejection === 'type') {
    return 'Please choose a JPEG, PNG or WebP image.'
  }
  if (rejection === 'size') {
    return `That image is too large. Please choose one under ${MAX_PHOTO_LABEL}.`
  }
  return "We couldn't read that file. Please choose another image."
}
