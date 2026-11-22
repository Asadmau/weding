import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const storyInputSchema = z.object({
  title: z.string().trim().min(2, 'Judul cerita minimal 2 karakter').max(120),
  periodLabel: z.string().trim().min(1, 'Label periode wajib diisi').max(50),
  storyDate: z.string().trim().max(50).default(''),
  description: z.string().trim().min(5, 'Deskripsi cerita wajib diisi').max(1000),
  imageUrl: safeMediaUrlSchema.default(''),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export type StoryInput = z.infer<typeof storyInputSchema>;

function mapStory(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    title: String(row.title),
    periodLabel: String(row.period_label),
    storyDate: String(row.story_date || ''),
    description: String(row.description),
    imageUrl: String(row.image_url || ''),
    sortOrder: Number(row.sort_order),
  };
}

export function listStories() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const rows = db
    .prepare('SELECT * FROM love_stories WHERE invitation_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(invId) as Record<string, unknown>[];
  return rows.map(mapStory);
}

export function createStory(input: StoryInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO love_stories (
      id, invitation_id, title, period_label, story_date, description, image_url, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    invId,
    input.title,
    input.periodLabel,
    input.storyDate,
    input.description,
    input.imageUrl,
    input.sortOrder,
    timestamp,
    timestamp
  );

  const row = db.prepare('SELECT * FROM love_stories WHERE id = ?').get(id) as Record<string, unknown>;
  return mapStory(row);
}

export function updateStory(id: string, input: StoryInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const existing = db
    .prepare('SELECT id FROM love_stories WHERE id = ? AND invitation_id = ?')
    .get(id, invId);
  if (!existing) {
    throw new NotFoundError('Cerita cinta tidak ditemukan');
  }

  db.prepare(
    `UPDATE love_stories
     SET title = ?, period_label = ?, story_date = ?, description = ?, image_url = ?, sort_order = ?, updated_at = ?
     WHERE id = ? AND invitation_id = ?`
  ).run(
    input.title,
    input.periodLabel,
    input.storyDate,
    input.description,
    input.imageUrl,
    input.sortOrder,
    nowIso(),
    id,
    invId
  );

  const row = db.prepare('SELECT * FROM love_stories WHERE id = ?').get(id) as Record<string, unknown>;
  return mapStory(row);
}

export function deleteStory(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const result = db
    .prepare('DELETE FROM love_stories WHERE id = ? AND invitation_id = ?')
    .run(id, invId);
  if (result.changes === 0) {
    throw new NotFoundError('Cerita cinta tidak ditemukan');
  }
}
