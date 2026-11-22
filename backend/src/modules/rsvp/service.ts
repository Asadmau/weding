import crypto from 'node:crypto';
import { z } from 'zod';
import { generateSecureToken, sha256 } from '../../common/crypto.ts';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, paginationQuerySchema } from '../../common/validators.ts';
import { getDb, nowIso, withTransaction } from '../../db/client.ts';

export const publicRsvpSchema = z.object({
  slug: z.string().trim().min(1),
  guestToken: z.string().trim().max(200).optional(),
  guestSlug: z.string().trim().max(100).optional(),
  editToken: z.string().trim().max(200).optional(),
  guestName: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').max(120),
  guestPhone: z.string().trim().max(30).default(''),
  attendanceStatus: z.enum(['ATTENDING', 'NOT_ATTENDING']),
  guestCount: z.coerce.number().int().min(1).max(10).default(1),
  message: z.string().trim().max(500).default(''),
});

export const rsvpQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ALL', 'ATTENDING', 'NOT_ATTENDING', 'PENDING']).default('ALL'),
});

export function submitPublicRsvp(input: z.infer<typeof publicRsvpSchema>) {
  const db = getDb();
  const inv = db
    .prepare('SELECT id FROM invitations WHERE slug = ? AND is_published = 1 LIMIT 1')
    .get(input.slug) as { id: string } | undefined;

  if (!inv) {
    throw new NotFoundError('Undangan tidak ditemukan');
  }

  const settings = db
    .prepare('SELECT rsvp_enabled FROM site_settings WHERE invitation_id = ?')
    .get(inv.id) as { rsvp_enabled: number } | undefined;
  if (settings && settings.rsvp_enabled !== 1) {
    throw new ForbiddenError('Konfirmasi RSVP saat ini sedang ditutup');
  }

  return withTransaction((tx) => {
    const timestamp = nowIso();
    const normalizedCount = input.attendanceStatus === 'NOT_ATTENDING' ? 0 : input.guestCount;

    // Case 1: Personalized guest identified by the private guest URL slug.
    // Legacy cryptographic tokens remain supported for links already distributed.
    if (input.guestSlug || input.guestToken) {
      const guest = input.guestSlug
        ? (tx
            .prepare(
              'SELECT id, full_name, phone, max_guests FROM guests WHERE invitation_id = ? AND guest_slug = ? LIMIT 1'
            )
            .get(inv.id, input.guestSlug) as
            | { id: string; full_name: string; phone: string; max_guests: number }
            | undefined)
        : (tx
            .prepare(
              'SELECT id, full_name, phone, max_guests FROM guests WHERE invitation_id = ? AND token_hash = ? LIMIT 1'
            )
            .get(inv.id, sha256(input.guestToken!)) as
            | { id: string; full_name: string; phone: string; max_guests: number }
            | undefined);

      if (!guest) {
        throw new ForbiddenError('Tautan undangan personal tidak valid');
      }

      if (input.attendanceStatus === 'ATTENDING' && normalizedCount > guest.max_guests) {
        throw new BadRequestError(`Jumlah tamu maksimal untuk undangan ini adalah ${guest.max_guests} orang`);
      }

      const existingRsvp = tx
        .prepare('SELECT id FROM rsvps WHERE guest_id = ? LIMIT 1')
        .get(guest.id) as { id: string } | undefined;

      if (existingRsvp) {
        tx.prepare(
          `UPDATE rsvps
           SET guest_name = ?, guest_phone = ?, attendance_status = ?, guest_count = ?, message = ?, updated_at = ?
           WHERE id = ?`
        ).run(
          guest.full_name,
          input.guestPhone || guest.phone,
          input.attendanceStatus,
          normalizedCount,
          input.message,
          timestamp,
          existingRsvp.id
        );

        return {
          id: existingRsvp.id,
          guestName: guest.full_name,
          attendanceStatus: input.attendanceStatus,
          guestCount: normalizedCount,
          message: input.message,
          isPersonalized: true,
          editToken: null,
          updatedAt: timestamp,
        };
      }

      const rsvpId = crypto.randomUUID();
      tx.prepare(
        `INSERT INTO rsvps (
          id, invitation_id, guest_id, guest_name, guest_phone, attendance_status, guest_count, message, edit_token_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
      ).run(
        rsvpId,
        inv.id,
        guest.id,
        guest.full_name,
        input.guestPhone || guest.phone,
        input.attendanceStatus,
        normalizedCount,
        input.message,
        timestamp,
        timestamp
      );

      return {
        id: rsvpId,
        guestName: guest.full_name,
        attendanceStatus: input.attendanceStatus,
        guestCount: normalizedCount,
        message: input.message,
        isPersonalized: true,
        editToken: null,
        updatedAt: timestamp,
      };
    }

    // Case 2: Public guest updating an existing public RSVP via validated editToken
    if (input.editToken) {
      const editHash = sha256(input.editToken);
      const existingPublic = tx
        .prepare(
          'SELECT id FROM rsvps WHERE invitation_id = ? AND guest_id IS NULL AND edit_token_hash = ? LIMIT 1'
        )
        .get(inv.id, editHash) as { id: string } | undefined;

      if (!existingPublic) {
        throw new ForbiddenError('Token pembaruan RSVP tidak valid');
      }

      tx.prepare(
        `UPDATE rsvps
         SET guest_name = ?, guest_phone = ?, attendance_status = ?, guest_count = ?, message = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        input.guestName,
        input.guestPhone,
        input.attendanceStatus,
        normalizedCount,
        input.message,
        timestamp,
        existingPublic.id
      );

      return {
        id: existingPublic.id,
        guestName: input.guestName,
        attendanceStatus: input.attendanceStatus,
        guestCount: normalizedCount,
        message: input.message,
        isPersonalized: false,
        editToken: input.editToken,
        updatedAt: timestamp,
      };
    }

    // Case 3: New public RSVP
    const rsvpId = crypto.randomUUID();
    const newEditToken = generateSecureToken(20);
    const newEditHash = sha256(newEditToken);

    tx.prepare(
      `INSERT INTO rsvps (
        id, invitation_id, guest_id, guest_name, guest_phone, attendance_status, guest_count, message, edit_token_hash, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      rsvpId,
      inv.id,
      input.guestName,
      input.guestPhone,
      input.attendanceStatus,
      normalizedCount,
      input.message,
      newEditHash,
      timestamp,
      timestamp
    );

    return {
      id: rsvpId,
      guestName: input.guestName,
      attendanceStatus: input.attendanceStatus,
      guestCount: normalizedCount,
      message: input.message,
      isPersonalized: false,
      editToken: newEditToken,
      updatedAt: timestamp,
    };
  });
}

export function getRsvpSummaryAndList(query: z.infer<typeof rsvpQuerySchema>) {
  const db = getDb();
  const invId = getSingleInvitationId(db);

  const statsRow = db
    .prepare(
      `SELECT
         COUNT(*) as total_responses,
         SUM(CASE WHEN attendance_status = 'ATTENDING' THEN 1 ELSE 0 END) as attending_responses,
         SUM(CASE WHEN attendance_status = 'NOT_ATTENDING' THEN 1 ELSE 0 END) as not_attending_responses,
         COALESCE(SUM(CASE WHEN attendance_status = 'ATTENDING' THEN guest_count ELSE 0 END), 0) as total_headcount
       FROM rsvps
       WHERE invitation_id = ?`
    )
    .get(invId) as {
    total_responses: number;
    attending_responses: number | null;
    not_attending_responses: number | null;
    total_headcount: number | null;
  };

  const pendingGuestsRow = db
    .prepare(
      `SELECT COUNT(*) as pending_count
       FROM guests g
       LEFT JOIN rsvps r ON r.guest_id = g.id
       WHERE g.invitation_id = ? AND (r.id IS NULL OR r.attendance_status = 'PENDING')`
    )
    .get(invId) as { pending_count: number };

  const conditions: string[] = ['r.invitation_id = ?'];
  const params: (string | number)[] = [invId];

  if (query.status !== 'ALL') {
    conditions.push('r.attendance_status = ?');
    params.push(query.status);
  }
  if (query.search) {
    conditions.push('(r.guest_name LIKE ? OR r.guest_phone LIKE ? OR r.message LIKE ?)');
    const pattern = `%${query.search}%`;
    params.push(pattern, pattern, pattern);
  }

  const whereClause = conditions.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) as total FROM rsvps r WHERE ${whereClause}`).get(...params) as {
      total: number;
    }
  ).total;

  const offset = (query.page - 1) * query.limit;
  const rows = db
    .prepare(
      `SELECT r.*, g.group_name
       FROM rsvps r
       LEFT JOIN guests g ON g.id = r.guest_id
       WHERE ${whereClause}
       ORDER BY r.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, query.limit, offset) as Record<string, unknown>[];

  return {
    summary: {
      totalResponses: statsRow.total_responses || 0,
      attendingCount: statsRow.attending_responses || 0,
      notAttendingCount: statsRow.not_attending_responses || 0,
      pendingGuestCount: pendingGuestsRow.pending_count || 0,
      totalHeadcount: statsRow.total_headcount || 0,
    },
    items: rows.map((r) => ({
      id: String(r.id),
      guestId: r.guest_id ? String(r.guest_id) : null,
      guestName: String(r.guest_name),
      guestPhone: String(r.guest_phone || ''),
      groupName: r.group_name ? String(r.group_name) : 'Publik',
      attendanceStatus: String(r.attendance_status),
      guestCount: Number(r.guest_count || 0),
      message: String(r.message || ''),
      updatedAt: String(r.updated_at),
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

function escapeCsvCell(value: string | number): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportRsvpsCsv(): string {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const rows = db
    .prepare(
      `SELECT r.guest_name, r.guest_phone, COALESCE(g.group_name, 'Publik') as group_name,
              r.attendance_status, r.guest_count, r.message, r.updated_at
       FROM rsvps r
       LEFT JOIN guests g ON g.id = r.guest_id
       WHERE r.invitation_id = ?
       ORDER BY r.updated_at DESC`
    )
    .all(invId) as Record<string, unknown>[];

  const header = ['Nama Tamu', 'Telepon', 'Grup', 'Status Kehadiran', 'Jumlah Tamu', 'Pesan', 'Diperbarui'];
  const lines = [header.map(escapeCsvCell).join(',')];

  for (const r of rows) {
    lines.push(
      [
        String(r.guest_name),
        String(r.guest_phone || ''),
        String(r.group_name || 'Publik'),
        String(r.attendance_status),
        Number(r.guest_count || 0),
        String(r.message || ''),
        String(r.updated_at),
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return lines.join('\n');
}
