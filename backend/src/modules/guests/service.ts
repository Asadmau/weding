import crypto from 'node:crypto';
import { z } from 'zod';
import {
  encryptValue,
  generateSecureToken,
  sha256,
} from '../../common/crypto.ts';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, paginationQuerySchema } from '../../common/validators.ts';
import { env } from '../../config/env.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const guestInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama tamu minimal 2 karakter').max(120),
  phone: z.string().trim().max(30).default(''),
  email: z
    .string()
    .trim()
    .max(150)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Format email tidak valid')
    .default(''),
  groupName: z.string().trim().max(80).default('Umum'),
  maxGuests: z.coerce.number().int().min(1).max(20).default(2),
  notes: z.string().trim().max(300).default(''),
});

export const guestQuerySchema = paginationQuerySchema.extend({
  rsvpStatus: z.enum(['ALL', 'ATTENDING', 'NOT_ATTENDING', 'PENDING']).default('ALL'),
  sortBy: z.enum(['created_at', 'full_name', 'group_name']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GuestInput = z.infer<typeof guestInputSchema>;

function slugifyGuestName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/g, '') || 'tamu'
  );
}

function createUniqueGuestSlug(
  db: ReturnType<typeof getDb>,
  invitationId: string,
  fullName: string
): string {
  const base = slugifyGuestName(fullName);
  const findSlug = db.prepare(
    'SELECT id FROM guests WHERE invitation_id = ? AND guest_slug = ? LIMIT 1'
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${crypto.randomBytes(8).toString('hex')}`;
    if (!findSlug.get(invitationId, candidate)) return candidate;
  }

  throw new Error('Tidak dapat membuat slug tamu yang unik');
}

function mapGuestRow(row: Record<string, unknown>, slug: string) {
  const guestSlug = String(row.guest_slug || '');
  const personalizedPath = guestSlug ? `/${slug}/${guestSlug}` : null;

  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    guestSlug,
    fullName: String(row.full_name),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    groupName: String(row.group_name || 'Umum'),
    maxGuests: Number(row.max_guests || 2),
    notes: String(row.notes || ''),
    rsvpStatus: String(row.attendance_status || 'PENDING'),
    rsvpGuestCount: row.rsvp_guest_count != null ? Number(row.rsvp_guest_count) : null,
    personalizedPath,
    hasActiveLink: Boolean(personalizedPath),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listGuests(query: z.infer<typeof guestQuerySchema>) {
  const db = getDb();
  const inv = db.prepare('SELECT id, slug FROM invitations LIMIT 1').get() as
    | { id: string; slug: string }
    | undefined;
  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const conditions: string[] = ['g.invitation_id = ?'];
  const params: (string | number)[] = [inv.id];

  if (query.search) {
    conditions.push('(g.full_name LIKE ? OR g.group_name LIKE ? OR g.phone LIKE ?)');
    const pattern = `%${query.search}%`;
    params.push(pattern, pattern, pattern);
  }

  if (query.rsvpStatus === 'ATTENDING' || query.rsvpStatus === 'NOT_ATTENDING') {
    conditions.push('r.attendance_status = ?');
    params.push(query.rsvpStatus);
  } else if (query.rsvpStatus === 'PENDING') {
    conditions.push("(r.attendance_status IS NULL OR r.attendance_status = 'PENDING')");
  }

  const whereClause = conditions.join(' AND ');
  const sortColMap: Record<string, string> = {
    created_at: 'g.created_at',
    full_name: 'g.full_name',
    group_name: 'g.group_name',
  };
  const sortCol = sortColMap[query.sortBy] || 'g.created_at';
  const sortDir = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE ${whereClause}`
    )
    .get(...params) as { total: number };

  const offset = (query.page - 1) * query.limit;
  const rows = db
    .prepare(
      `SELECT g.*, r.attendance_status, r.guest_count as rsvp_guest_count
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`
    )
    .all(...params, query.limit, offset) as Record<string, unknown>[];

  return {
    items: rows.map((row) => mapGuestRow(row, inv.slug)),
    meta: {
      page: query.page,
      limit: query.limit,
      total: countRow.total,
      totalPages: Math.max(1, Math.ceil(countRow.total / query.limit)),
    },
  };
}

export function createGuest(input: GuestInput) {
  const db = getDb();
  const inv = db.prepare('SELECT id, slug FROM invitations LIMIT 1').get() as
    | { id: string; slug: string }
    | undefined;
  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const id = crypto.randomUUID();
  const rawToken = generateSecureToken(24);
  const tokenHash = sha256(rawToken);
  const tokenEncrypted = encryptValue(rawToken, env.sessionKey);
  const guestSlug = createUniqueGuestSlug(db, inv.id, input.fullName);
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO guests (
      id, invitation_id, full_name, phone, email, group_name, max_guests, guest_slug, token_hash, token_encrypted, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    inv.id,
    input.fullName,
    input.phone,
    input.email,
    input.groupName,
    input.maxGuests,
    guestSlug,
    tokenHash,
    tokenEncrypted,
    input.notes,
    timestamp,
    timestamp
  );

  const row = db
    .prepare(
      `SELECT g.*, r.attendance_status, r.guest_count as rsvp_guest_count
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE g.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapGuestRow(row, inv.slug);
}

export function updateGuest(id: string, input: GuestInput) {
  const db = getDb();
  const inv = db.prepare('SELECT id, slug FROM invitations LIMIT 1').get() as
    | { id: string; slug: string }
    | undefined;
  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const existing = db
    .prepare('SELECT id FROM guests WHERE id = ? AND invitation_id = ?')
    .get(id, inv.id);
  if (!existing) {
    throw new NotFoundError('Data tamu tidak ditemukan');
  }

  db.prepare(
    `UPDATE guests
     SET full_name = ?, phone = ?, email = ?, group_name = ?, max_guests = ?, notes = ?, updated_at = ?
     WHERE id = ? AND invitation_id = ?`
  ).run(
    input.fullName,
    input.phone,
    input.email,
    input.groupName,
    input.maxGuests,
    input.notes,
    nowIso(),
    id,
    inv.id
  );

  const row = db
    .prepare(
      `SELECT g.*, r.attendance_status, r.guest_count as rsvp_guest_count
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE g.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapGuestRow(row, inv.slug);
}

export function regenerateGuestToken(id: string) {
  const db = getDb();
  const inv = db.prepare('SELECT id, slug FROM invitations LIMIT 1').get() as
    | { id: string; slug: string }
    | undefined;
  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const existing = db
    .prepare('SELECT id FROM guests WHERE id = ? AND invitation_id = ?')
    .get(id, inv.id);
  if (!existing) {
    throw new NotFoundError('Data tamu tidak ditemukan');
  }

  const rawToken = generateSecureToken(24);
  const tokenHash = sha256(rawToken);
  const tokenEncrypted = encryptValue(rawToken, env.sessionKey);
  const guest = db.prepare('SELECT full_name FROM guests WHERE id = ?').get(id) as
    | { full_name: string }
    | undefined;
  if (!guest) {
    throw new NotFoundError('Data tamu tidak ditemukan');
  }
  const guestSlug = createUniqueGuestSlug(db, inv.id, guest.full_name);

  db.prepare(
    'UPDATE guests SET guest_slug = ?, token_hash = ?, token_encrypted = ?, updated_at = ? WHERE id = ? AND invitation_id = ?'
  ).run(guestSlug, tokenHash, tokenEncrypted, nowIso(), id, inv.id);

  const row = db
    .prepare(
      `SELECT g.*, r.attendance_status, r.guest_count as rsvp_guest_count
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE g.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapGuestRow(row, inv.slug);
}

export function deleteGuest(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const result = db
    .prepare('DELETE FROM guests WHERE id = ? AND invitation_id = ?')
    .run(id, invId);
  if (result.changes === 0) {
    throw new NotFoundError('Data tamu tidak ditemukan');
  }
}

export function resolvePublicGuestBySlug(slug: string, guestSlug: string) {
  if (!guestSlug || guestSlug.length > 100 || !/^[a-z0-9-]+$/.test(guestSlug)) {
    throw new NotFoundError('Tautan undangan personal tidak valid');
  }

  const db = getDb();
  const guest = db
    .prepare(
      `SELECT g.id, g.full_name, g.group_name, g.max_guests, g.invitation_id
       FROM guests g
       INNER JOIN invitations i ON i.id = g.invitation_id
       WHERE i.slug = ? AND i.is_published = 1 AND g.guest_slug = ?
       LIMIT 1`
    )
    .get(slug, guestSlug) as
    | {
        id: string;
        full_name: string;
        group_name: string;
        max_guests: number;
        invitation_id: string;
      }
    | undefined;

  if (!guest) {
    throw new NotFoundError('Tautan undangan personal tidak ditemukan atau sudah tidak berlaku');
  }

  const rsvp = db
    .prepare(
      `SELECT id, attendance_status, guest_count, message, updated_at
       FROM rsvps
       WHERE guest_id = ?
       LIMIT 1`
    )
    .get(guest.id) as
    | {
        id: string;
        attendance_status: string;
        guest_count: number;
        message: string;
        updated_at: string;
      }
    | undefined;

  return {
    guest: {
      id: guest.id,
      fullName: guest.full_name,
      groupName: guest.group_name,
      maxGuests: guest.max_guests,
    },
    rsvp: rsvp
      ? {
          id: rsvp.id,
          attendanceStatus: rsvp.attendance_status,
          guestCount: rsvp.guest_count,
          message: rsvp.message,
          updatedAt: rsvp.updated_at,
        }
      : null,
  };
}

export function resolvePublicGuestByToken(slug: string, rawToken: string) {
  if (!rawToken || rawToken.length < 10) {
    throw new NotFoundError('Tautan undangan personal tidak valid');
  }

  const db = getDb();
  const inv = db
    .prepare('SELECT id FROM invitations WHERE slug = ? AND is_published = 1 LIMIT 1')
    .get(slug) as { id: string } | undefined;

  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const tokenHash = sha256(rawToken);
  const guest = db
    .prepare(
      `SELECT id, full_name, group_name, max_guests
       FROM guests
       WHERE invitation_id = ? AND token_hash = ?
       LIMIT 1`
    )
    .get(inv.id, tokenHash) as
    | {
        id: string;
        full_name: string;
        group_name: string;
        max_guests: number;
      }
    | undefined;

  if (!guest) {
    throw new NotFoundError('Tautan undangan personal tidak ditemukan atau sudah tidak berlaku');
  }

  const rsvp = db
    .prepare(
      `SELECT id, attendance_status, guest_count, message, updated_at
       FROM rsvps
       WHERE guest_id = ?
       LIMIT 1`
    )
    .get(guest.id) as
    | {
        id: string;
        attendance_status: string;
        guest_count: number;
        message: string;
        updated_at: string;
      }
    | undefined;

  return {
    guest: {
      id: guest.id,
      fullName: guest.full_name,
      groupName: guest.group_name,
      maxGuests: guest.max_guests,
    },
    rsvp: rsvp
      ? {
          id: rsvp.id,
          attendanceStatus: rsvp.attendance_status,
          guestCount: rsvp.guest_count,
          message: rsvp.message,
          updatedAt: rsvp.updated_at,
        }
      : null,
  };
}
