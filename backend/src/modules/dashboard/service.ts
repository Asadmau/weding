import { getSingleInvitationId } from '../../common/validators.ts';
import { getDb } from '../../db/client.ts';

export function getAdminDashboardStats() {
  const db = getDb();
  const invId = getSingleInvitationId(db);

  const invitation = db
    .prepare(
      `SELECT i.id, i.title, i.slug, i.is_published, i.primary_date, t.key as template_key, t.name as template_name
       FROM invitations i
       LEFT JOIN templates t ON t.id = i.template_id
       WHERE i.id = ?`
    )
    .get(invId) as Record<string, unknown>;

  const guestCount = (
    db.prepare('SELECT COUNT(*) as c FROM guests WHERE invitation_id = ?').get(invId) as { c: number }
  ).c;

  const rsvpStats = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN attendance_status = 'ATTENDING' THEN 1 ELSE 0 END) as attending,
         SUM(CASE WHEN attendance_status = 'NOT_ATTENDING' THEN 1 ELSE 0 END) as not_attending,
         COALESCE(SUM(CASE WHEN attendance_status = 'ATTENDING' THEN guest_count ELSE 0 END), 0) as headcount
       FROM rsvps WHERE invitation_id = ?`
    )
    .get(invId) as {
    total: number;
    attending: number | null;
    not_attending: number | null;
    headcount: number | null;
  };

  const pendingGuests = (
    db
      .prepare(
        `SELECT COUNT(*) as c
         FROM guests g
         LEFT JOIN rsvps r ON r.guest_id = g.id
         WHERE g.invitation_id = ? AND r.id IS NULL`
      )
      .get(invId) as { c: number }
  ).c;

  const wishStats = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved
       FROM wishes WHERE invitation_id = ?`
    )
    .get(invId) as {
    total: number;
    pending: number | null;
    approved: number | null;
  };

  const galleryCount = (
    db.prepare('SELECT COUNT(*) as c FROM galleries WHERE invitation_id = ?').get(invId) as { c: number }
  ).c;

  const eventsCount = (
    db.prepare('SELECT COUNT(*) as c FROM events WHERE invitation_id = ?').get(invId) as { c: number }
  ).c;

  const recentRsvps = db
    .prepare(
      `SELECT id, guest_name, attendance_status, guest_count, updated_at
       FROM rsvps WHERE invitation_id = ? ORDER BY updated_at DESC LIMIT 5`
    )
    .all(invId) as Record<string, unknown>[];

  const recentWishes = db
    .prepare(
      `SELECT id, author_name, message, status, created_at
       FROM wishes WHERE invitation_id = ? ORDER BY created_at DESC LIMIT 5`
    )
    .all(invId) as Record<string, unknown>[];

  return {
    invitation: {
      id: String(invitation.id),
      title: String(invitation.title),
      slug: String(invitation.slug),
      isPublished: Number(invitation.is_published) === 1,
      primaryDate: String(invitation.primary_date),
      templateKey: String(invitation.template_key || 'classic-elegant'),
      templateName: String(invitation.template_name || 'Classic Elegant'),
    },
    metrics: {
      totalGuests: guestCount,
      totalRsvps: rsvpStats.total || 0,
      attendingCount: rsvpStats.attending || 0,
      notAttendingCount: rsvpStats.not_attending || 0,
      pendingGuestRsvps: pendingGuests,
      totalHeadcount: rsvpStats.headcount || 0,
      totalWishes: wishStats.total || 0,
      pendingWishes: wishStats.pending || 0,
      approvedWishes: wishStats.approved || 0,
      galleryCount,
      eventsCount,
    },
    recentRsvps: recentRsvps.map((r) => ({
      id: String(r.id),
      guestName: String(r.guest_name),
      attendanceStatus: String(r.attendance_status),
      guestCount: Number(r.guest_count || 0),
      updatedAt: String(r.updated_at),
    })),
    recentWishes: recentWishes.map((w) => ({
      id: String(w.id),
      authorName: String(w.author_name),
      message: String(w.message),
      status: String(w.status),
      createdAt: String(w.created_at),
    })),
  };
}
