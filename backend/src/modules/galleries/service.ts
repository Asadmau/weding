import crypto from 'node:crypto';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';
import { storageService } from '../../storage/storageService.ts';

export const galleryMetadataSchema = z.object({
  title: z.string().trim().min(1, 'Judul foto wajib diisi').max(120),
  caption: z.string().trim().max(300).default(''),
  imageUrl: safeMediaUrlSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).max(500).default(0),
});

function mapGallery(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    title: String(row.title),
    caption: String(row.caption || ''),
    imageUrl: String(row.image_url),
    mimeType: String(row.mime_type || 'image/jpeg'),
    fileSize: Number(row.file_size || 0),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at),
  };
}

export function listGalleries() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const rows = db
    .prepare('SELECT * FROM galleries WHERE invitation_id = ? ORDER BY sort_order ASC, created_at DESC')
    .all(invId) as Record<string, unknown>[];
  return rows.map(mapGallery);
}

export async function addGalleryItem(
  input: z.infer<typeof galleryMetadataSchema>,
  file?: { buffer: Buffer; mimetype: string; size: number }
) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  let imageUrl = input.imageUrl || '';
  let storageKey = '';
  let mimeType = 'image/jpeg';
  let fileSize = 0;

  if (file) {
    const stored = await storageService.saveImage(file);
    imageUrl = stored.publicUrl;
    storageKey = stored.storageKey;
    mimeType = stored.mimeType;
    fileSize = stored.fileSize;
  } else if (!imageUrl) {
    throw new BadRequestError('File gambar atau URL gambar wajib diisi');
  }

  const id = crypto.randomUUID();
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO galleries (
      id, invitation_id, title, caption, image_url, storage_key, mime_type, file_size, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    invId,
    input.title,
    input.caption,
    imageUrl,
    storageKey,
    mimeType,
    fileSize,
    input.sortOrder,
    timestamp,
    timestamp
  );

  const row = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id) as Record<string, unknown>;
  return mapGallery(row);
}

export async function deleteGalleryItem(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const row = db
    .prepare('SELECT id, storage_key FROM galleries WHERE id = ? AND invitation_id = ?')
    .get(id, invId) as { id: string; storage_key: string } | undefined;

  if (!row) {
    throw new NotFoundError('Foto galeri tidak ditemukan');
  }

  db.prepare('DELETE FROM galleries WHERE id = ? AND invitation_id = ?').run(id, invId);
  if (row.storage_key) {
    await storageService.deleteImage(row.storage_key);
  }
}
