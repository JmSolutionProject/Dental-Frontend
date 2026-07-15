import { describe, it, expect } from 'vitest';
import {
  validateAttachment,
  isValidMimeType,
  isImage,
  isPdf,
  isWithinSizeLimit,
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENT_SIZE,
} from './attachment';

function fakeFile(name: string, type: string, size: number): File {
  return new File(['x'.repeat(size)], name, { type });
}

describe('validateAttachment', () => {
  it('accepts valid JPEG under size limit', () => {
    const file = fakeFile('xray.jpg', 'image/jpeg', 1024);
    expect(validateAttachment(file)).toEqual({ valid: true });
  });

  it('accepts valid PNG under size limit', () => {
    const file = fakeFile('photo.png', 'image/png', 2048);
    expect(validateAttachment(file)).toEqual({ valid: true });
  });

  it('accepts valid PDF under size limit', () => {
    const file = fakeFile('consent.pdf', 'application/pdf', 512);
    expect(validateAttachment(file)).toEqual({ valid: true });
  });

  it('accepts file at exact size limit', () => {
    const file = fakeFile('big.jpg', 'image/jpeg', MAX_ATTACHMENT_SIZE);
    expect(validateAttachment(file)).toEqual({ valid: true });
  });

  it('rejects unknown MIME type', () => {
    const file = fakeFile('script.exe', 'application/x-msdownload', 100);
    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_type');
    expect(result.message).toContain('not allowed');
  });

  it('rejects empty MIME type', () => {
    const file = fakeFile('noext', '', 100);
    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_type');
  });

  it('rejects file exceeding size limit', () => {
    const file = fakeFile('huge.jpg', 'image/jpeg', MAX_ATTACHMENT_SIZE + 1);
    const result = validateAttachment(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('size_exceeded');
    expect(result.message).toContain('MB limit');
  });

  it('accepts all allowed MIME types individually', () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      const file = fakeFile(`test.${mime.split('/')[1]}`, mime, 100);
      expect(validateAttachment(file).valid).toBe(true);
    }
  });
});

describe('isValidMimeType', () => {
  it('returns true for allowed types', () => {
    expect(isValidMimeType('image/jpeg')).toBe(true);
    expect(isValidMimeType('application/pdf')).toBe(true);
  });

  it('returns false for disallowed types', () => {
    expect(isValidMimeType('text/html')).toBe(false);
    expect(isValidMimeType('application/zip')).toBe(false);
    expect(isValidMimeType('')).toBe(false);
  });
});

describe('isImage', () => {
  it('returns true for image MIME types', () => {
    expect(isImage('image/jpeg')).toBe(true);
    expect(isImage('image/png')).toBe(true);
    expect(isImage('image/svg+xml')).toBe(true);
  });

  it('returns false for non-image types', () => {
    expect(isImage('application/pdf')).toBe(false);
    expect(isImage('text/plain')).toBe(false);
  });
});

describe('isPdf', () => {
  it('returns true only for PDF', () => {
    expect(isPdf('application/pdf')).toBe(true);
    expect(isPdf('image/jpeg')).toBe(false);
    expect(isPdf('application/octet-stream')).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  it('returns true when size is within limit', () => {
    expect(isWithinSizeLimit(100)).toBe(true);
    expect(isWithinSizeLimit(MAX_ATTACHMENT_SIZE)).toBe(true);
  });

  it('returns false when size exceeds limit', () => {
    expect(isWithinSizeLimit(MAX_ATTACHMENT_SIZE + 1)).toBe(false);
  });
});
