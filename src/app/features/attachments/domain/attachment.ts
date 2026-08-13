// ---------------------------------------------------------------------------
// Attachments — domain types, validation, helpers
// ---------------------------------------------------------------------------

/** Supported MIME types for clinical attachments. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Maximum file size: 10 MB. */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

/** An attachment linked to a patient record (X-ray, consent form, photo). */
export interface Attachment {
  id: string;
  patientId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  servicioId?: string;
  servicioName?: string;
  createdAt: string;
  updatedAt: string;
}

/** Validation error codes for upload attempts. */
export type AttachmentValidationError = 'invalid_type' | 'size_exceeded';

export interface AttachmentValidationResult {
  valid: boolean;
  error?: AttachmentValidationError;
  message?: string;
}

// ---- Pure domain validators ------------------------------------------------

/** Checks whether a MIME string is in the allowed set. */
export function isValidMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Determines if a MIME type represents an image that can be previewed inline. */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** Determines if a MIME type is a PDF (download only, no inline preview). */
export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/** Checks whether the file size is within the allowed limit. */
export function isWithinSizeLimit(size: number): boolean {
  return size <= MAX_ATTACHMENT_SIZE;
}

/** Validates both MIME type and size for a candidate file. */
export function validateAttachment(
  file: File,
): AttachmentValidationResult {
  if (!isValidMimeType(file.type)) {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'unknown';
    return {
      valid: false,
      error: 'invalid_type',
      message: `File type ".${ext}" is not allowed. Accepted: images (JPEG, PNG, GIF, WebP, BMP, SVG) and PDF.`,
    };
  }

  if (!isWithinSizeLimit(file.size)) {
    const maxMB = (MAX_ATTACHMENT_SIZE / (1024 * 1024)).toFixed(0);
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: 'size_exceeded',
      message: `File size (${actualMB} MB) exceeds the ${maxMB} MB limit.`,
    };
  }

  return { valid: true };
}

/** Human-readable label for a MIME type category. */
export function attachmentCategoryLabel(mimeType: string): string {
  if (isPdf(mimeType)) return 'Document';
  if (isImage(mimeType)) return 'Image';
  return 'File';
}
