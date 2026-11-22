import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const eventInputSchema = z.object({
  title: z.string().trim().min(2, 'Judul acara minimal 2 karakter').max(100),
  category: z.enum(['CEREMONY', 'RECEPTION', 'OTHER']).default('CEREMONY'),
  eventDate: z.string().trim().min(4).max(40),
  startTime: z.string().trim().min(2).max(20),
  endTime: z.string().trim().max(20).default(''),
  timezone: z.string().trim().max(15).default('WIB'),
  venueName: z.string().trim().min(2, 'Nama lokasi wajib diisi').max(150),
  venueAddress: z.string().trim().min(5, 'Alamat lengkap wajib diisi').max(400),
  mapsUrl: safeMediaUrlSchema.default(''),
  mapsEmbedUrl: safeMediaUrlSchema.default(''),
  dressCode: z.string().trim().max(150).default(''),
  description: z.string().trim().max(500).default(''),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export type EventInput = z.infer<typeof eventInputSchema>;

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    title: String(row.title),
    category: String(row.category),
    eventDate: String(row.event_date),
    startTime: String(row.start_time),
    endTime: String(row.end_time || ''),
    timezone: String(row.timezone || 'WIB'),
    venueName: String(row.venue_name),
    venueAddress: String(row.venue_address),
    mapsUrl: String(row.maps_url || ''),
    mapsEmbedUrl: String(row.maps_embed_url || ''),
    dressCode: String(row.dress_code || ''),
    description: String(row.description || ''),
    sortOrder: Number(row.sort_order),
  };
}

export function listEvents() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const rows = db
    .prepare('SELECT * FROM events WHERE invitation_id = ? ORDER BY sort_order ASC, event_date ASC')
    .all(invId) as Record<string, unknown>[];
  return rows.map(mapEvent);
}

export function createEvent(input: EventInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO events (
      id, invitation_id, title, category, event_date, start_time, end_time, timezone,
      venue_name, venue_address, maps_url, maps_embed_url, dress_code, description, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    invId,
    input.title,
    input.category,
    input.eventDate,
    input.startTime,
    input.endTime,
    input.timezone,
    input.venueName,
    input.venueAddress,
    input.mapsUrl,
    input.mapsEmbedUrl,
    input.dressCode,
    input.description,
    input.sortOrder,
    timestamp,
    timestamp
  );

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown>;
  return mapEvent(row);
}

export function updateEvent(id: string, input: EventInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const existing = db
    .prepare('SELECT id FROM events WHERE id = ? AND invitation_id = ?')
    .get(id, invId);
  if (!existing) {
    throw new NotFoundError('Acara tidak ditemukan');
  }

  db.prepare(
    `UPDATE events
     SET title = ?, category = ?, event_date = ?, start_time = ?, end_time = ?, timezone = ?,
         venue_name = ?, venue_address = ?, maps_url = ?, maps_embed_url = ?, dress_code = ?,
         description = ?, sort_order = ?, updated_at = ?
     WHERE id = ? AND invitation_id = ?`
  ).run(
    input.title,
    input.category,
    input.eventDate,
    input.startTime,
    input.endTime,
    input.timezone,
    input.venueName,
    input.venueAddress,
    input.mapsUrl,
    input.mapsEmbedUrl,
    input.dressCode,
    input.description,
    input.sortOrder,
    nowIso(),
    id,
    invId
  );

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Record<string, unknown>;
  return mapEvent(row);
}

export function deleteEvent(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const result = db
    .prepare('DELETE FROM events WHERE id = ? AND invitation_id = ?')
    .run(id, invId);
  if (result.changes === 0) {
    throw new NotFoundError('Acara tidak ditemukan');
  }
}
