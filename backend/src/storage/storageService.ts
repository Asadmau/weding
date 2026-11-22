import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BadRequestError } from '../common/errors.ts';
import { env } from '../config/env.ts';

export interface StoredFileResult {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
}

export interface StorageProvider {
  saveImage(file: { buffer: Buffer; mimetype: string; size: number }): Promise<StoredFileResult>;
  deleteImage(storageKey: string): Promise<void>;
}

const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

function hasValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir = env.uploadDir) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolveSafePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('\0')) {
      throw new BadRequestError('Nama file tidak valid');
    }
    const cleanKey = path.basename(storageKey);
    const resolved = path.resolve(this.baseDir, cleanKey);
    if (!resolved.startsWith(this.baseDir + path.sep)) {
      throw new BadRequestError('Akses path file tidak diizinkan');
    }
    return resolved;
  }

  async saveImage(file: { buffer: Buffer; mimetype: string; size: number }): Promise<StoredFileResult> {
    const ext = ALLOWED_MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestError('Format gambar harus JPG, PNG, atau WebP');
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestError('Ukuran gambar maksimal 5 MB');
    }
    if (!hasValidImageMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestError('Isi file tidak sesuai dengan format gambar yang diizinkan');
    }

    await fs.mkdir(this.baseDir, { recursive: true });
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const targetPath = this.resolveSafePath(storageKey);
    await fs.writeFile(targetPath, file.buffer);

    return {
      storageKey,
      publicUrl: `/uploads/${storageKey}`,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async deleteImage(storageKey: string): Promise<void> {
    if (!storageKey) return;
    try {
      const targetPath = this.resolveSafePath(storageKey);
      await fs.unlink(targetPath);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

export const storageService: StorageProvider = new LocalStorageProvider();
