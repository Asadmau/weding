import crypto from 'node:crypto';
import { z } from 'zod';
import { sha256 } from '../../common/crypto.ts';
import { ForbiddenError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, paginationQuerySchema } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const publicWishSchema = z.object({
  slug: z.string().trim().min(1),
  guestToken: z.string().trim().max(200).optional(),
  guestSlug: z.string().trim().max(100).optional(),
  authorName: z.string().trim().min(2, 'Nama pengirim minimal 2 karakter').max(100),
  relationLabel: z.string().trim().max(80).default(''),
  message: z.string().trim().min(3, 'Ucapan minimal 3 karakter').max(800),
});

export const wishQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).default('ALL'),
});

function mapWish(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    guestId: row.guest_id ? String(row.guest_id) : null,
    authorName: String(row.author_name),
    relationLabel: String(row.relation_label || ''),
    message: String(row.message),
    status: String(row.status),
    moderatedAt: row.moderated_at ? String(row.moderated_at) : null,
    createdAt: String(row.created_at),
  };
}

export function submitPublicWish(input: z.infer<typeof publicWishSchema>) {
  const db = getDb();
  const inv = db
    .prepare('SELECT id FROM invitations WHERE slug = ? AND is_published = 1 LIMIT 1')
    .get(input.slug) as { id: string } | undefined;
  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const settings = db
    .prepare('SELECT wishes_enabled, wishes_auto_approve FROM site_settings WHERE invitation_id = ?')
    .get(inv.id) as { wishes_enabled: number; wishes_auto_approve: number } | undefined;

  if (settings && settings.wishes_enabled !== 1) {
    throw new ForbiddenError('Kolom ucapan saat ini sedang dinonaktifkan');
  }

  let guestId: string | null = null;
  let authorName = input.authorName;

  if (input.guestSlug || input.guestToken) {
    const guest = input.guestSlug
      ? (db
          .prepare('SELECT id, full_name FROM guests WHERE invitation_id = ? AND guest_slug = ? LIMIT 1')
          .get(inv.id, input.guestSlug) as { id: string; full_name: string } | undefined)
      : (db
          .prepare('SELECT id, full_name FROM guests WHERE invitation_id = ? AND token_hash = ? LIMIT 1')
          .get(inv.id, sha256(input.guestToken!)) as { id: string; full_name: string } | undefined);

    if (!guest) {
      throw new ForbiddenError('Tautan undangan personal tidak valid');
    }
    guestId = guest.id;
    authorName = input.authorName || guest.full_name;
  }

  const status = settings?.wishes_auto_approve === 1 ? 'APPROVED' : 'PENDING';
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO wishes (
      id, invitation_id, guest_id, author_name, relation_label, message, status, moderated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    inv.id,
    guestId,
    authorName,
    input.relationLabel,
    input.message,
    status,
    status === 'APPROVED' ? timestamp : null,
    timestamp,
    timestamp
  );

  return {
    id,
    authorName,
    relationLabel: input.relationLabel,
    message: input.message,
    status,
    createdAt: timestamp,
  };
}

export function listAdminWishes(query: z.infer<typeof wishQuerySchema>) {
  const db = getDb();
  const invId = getSingleInvitationId(db);

  const counts = db
    .prepare(
      `SELECT
         COUNT(*) as total_all,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
         SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
       FROM wishes WHERE invitation_id = ?`
    )
    .get(invId) as {
    total_all: number;
    pending_count: number | null;
    approved_count: number | null;
    rejected_count: number | null;
  };

  const conditions: string[] = ['invitation_id = ?'];
  const params: (string | number)[] = [invId];

  if (query.status !== 'ALL') {
    conditions.push('status = ?');
    params.push(query.status);
  }
  if (query.search) {
    conditions.push('(author_name LIKE ? OR message LIKE ?)');
    const pattern = `%${query.search}%`;
    params.push(pattern, pattern);
  }

  const whereClause = conditions.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) as total FROM wishes WHERE ${whereClause}`).get(...params) as {
      total: number;
    }
  ).total;

  const offset = (query.page - 1) * query.limit;
  const rows = db
    .prepare(
      `SELECT * FROM wishes WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, query.limit, offset) as Record<string, unknown>[];

  return {
    counts: {
      all: counts.total_all || 0,
      pending: counts.pending_count || 0,
      approved: counts.approved_count || 0,
      rejected: counts.rejected_count || 0,
    },
    items: rows.map(mapWish),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export function moderateWish(id: string, status: 'APPROVED' | 'REJECTED') {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const existing = db
    .prepare('SELECT id FROM wishes WHERE id = ? AND invitation_id = ?')
    .get(id, invId);
  if (!existing) {
    throw new NotFoundError('Ucapan tidak ditemukan');
  }

  const timestamp = nowIso();
  db.prepare(
    'UPDATE wishes SET status = ?, moderated_at = ?, updated_at = ? WHERE id = ? AND invitation_id = ?'
  ).run(status, timestamp, timestamp, id, invId);

  const row = db.prepare('SELECT * FROM wishes WHERE id = ?').get(id) as Record<string, unknown>;
  return mapWish(row);
}

export function deleteWish(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const result = db
    .prepare('DELETE FROM wishes WHERE id = ? AND invitation_id = ?')
    .run(id, invId);
  if (result.changes === 0) {
    throw new NotFoundError('Ucapan tidak ditemukan');
  }
}
