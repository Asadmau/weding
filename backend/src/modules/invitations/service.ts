import { ConflictError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';
import type { z } from 'zod';
import type { updateCoupleSchema, updateInvitationSchema } from './validation.ts';

export interface InvitationDto {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  isPublished: boolean;
  heroSubtitle: string;
  heroImageUrl: string;
  openingQuote: string;
  openingQuoteAuthor: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  musicUrl: string;
  musicTitle: string;
  isMusicEnabled: boolean;
  primaryDate: string;
  countdownTarget: string;
  updatedAt: string;
}

export interface CoupleDto {
  id: string;
  invitationId: string;
  groomFullName: string;
  groomNickName: string;
  groomParents: string;
  groomBio: string;
  groomInstagram: string;
  groomPhotoUrl: string;
  brideFullName: string;
  brideNickName: string;
  brideParents: string;
  brideBio: string;
  brideInstagram: string;
  bridePhotoUrl: string;
}

function mapInvitation(row: Record<string, unknown>): InvitationDto {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    templateId: String(row.template_id),
    isPublished: Number(row.is_published) === 1,
    heroSubtitle: String(row.hero_subtitle || ''),
    heroImageUrl: String(row.hero_image_url || ''),
    openingQuote: String(row.opening_quote || ''),
    openingQuoteAuthor: String(row.opening_quote_author || ''),
    seoTitle: String(row.seo_title || ''),
    seoDescription: String(row.seo_description || ''),
    ogImageUrl: String(row.og_image_url || ''),
    musicUrl: String(row.music_url || ''),
    musicTitle: String(row.music_title || ''),
    isMusicEnabled: Number(row.is_music_enabled) === 1,
    primaryDate: String(row.primary_date),
    countdownTarget: String(row.countdown_target),
    updatedAt: String(row.updated_at),
  };
}

function mapCouple(row: Record<string, unknown>): CoupleDto {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    groomFullName: String(row.groom_full_name),
    groomNickName: String(row.groom_nick_name),
    groomParents: String(row.groom_parents || ''),
    groomBio: String(row.groom_bio || ''),
    groomInstagram: String(row.groom_instagram || ''),
    groomPhotoUrl: String(row.groom_photo_url || ''),
    brideFullName: String(row.bride_full_name),
    brideNickName: String(row.bride_nick_name),
    brideParents: String(row.bride_parents || ''),
    brideBio: String(row.bride_bio || ''),
    brideInstagram: String(row.bride_instagram || ''),
    bridePhotoUrl: String(row.bride_photo_url || ''),
  };
}

export function getAdminInvitationBundle() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const inv = db.prepare('SELECT * FROM invitations WHERE id = ?').get(invId) as Record<string, unknown>;
  const couple = db.prepare('SELECT * FROM couples WHERE invitation_id = ?').get(invId) as
    | Record<string, unknown>
    | undefined;
  const tpl = db.prepare('SELECT id, key, name FROM templates WHERE id = ?').get(String(inv.template_id)) as
    | Record<string, unknown>
    | undefined;

  return {
    invitation: mapInvitation(inv),
    couple: couple ? mapCouple(couple) : null,
    activeTemplate: tpl
      ? { id: String(tpl.id), key: String(tpl.key), name: String(tpl.name) }
      : null,
  };
}

export function getDefaultPublicSlug(): string {
  const db = getDb();
  const row = db
    .prepare('SELECT slug FROM invitations WHERE is_published = 1 LIMIT 1')
    .get() as { slug: string } | undefined;
  if (!row) {
    throw new NotFoundError('Belum ada undangan yang dipublikasikan');
  }
  return row.slug;
}

export function getPublicInvitationBySlug(slug: string) {
  const db = getDb();
  const invRow = db
    .prepare('SELECT * FROM invitations WHERE slug = ? AND is_published = 1 LIMIT 1')
    .get(slug) as Record<string, unknown> | undefined;

  if (!invRow) {
    throw new NotFoundError('Undangan pernikahan tidak ditemukan atau belum dipublikasikan');
  }

  const invitationId = String(invRow.id);
  const templateRow = db
    .prepare('SELECT * FROM templates WHERE id = ? LIMIT 1')
    .get(String(invRow.template_id)) as Record<string, unknown> | undefined;
  const coupleRow = db
    .prepare('SELECT * FROM couples WHERE invitation_id = ? LIMIT 1')
    .get(invitationId) as Record<string, unknown> | undefined;

  const events = db
    .prepare('SELECT * FROM events WHERE invitation_id = ? ORDER BY sort_order ASC, event_date ASC')
    .all(invitationId) as Record<string, unknown>[];

  const stories = db
    .prepare('SELECT * FROM love_stories WHERE invitation_id = ? ORDER BY sort_order ASC')
    .all(invitationId) as Record<string, unknown>[];

  const galleries = db
    .prepare('SELECT id, title, caption, image_url, sort_order FROM galleries WHERE invitation_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(invitationId) as Record<string, unknown>[];

  const wishes = db
    .prepare(
      `SELECT id, author_name, relation_label, message, created_at
       FROM wishes
       WHERE invitation_id = ? AND status = 'APPROVED'
       ORDER BY created_at DESC
       LIMIT 100`
    )
    .all(invitationId) as Record<string, unknown>[];

  const gifts = db
    .prepare(
      `SELECT id, bank_name, account_number, account_holder, qr_image_url, notes, sort_order
       FROM gift_accounts
       WHERE invitation_id = ? AND is_active = 1
       ORDER BY sort_order ASC`
    )
    .all(invitationId) as Record<string, unknown>[];

  const settingsRow = db
    .prepare('SELECT * FROM site_settings WHERE invitation_id = ? LIMIT 1')
    .get(invitationId) as Record<string, unknown> | undefined;

  return {
    invitation: mapInvitation(invRow),
    template: templateRow
      ? {
          id: String(templateRow.id),
          key: String(templateRow.key),
          name: String(templateRow.name),
          accentColor: String(templateRow.accent_color),
        }
      : { id: 'tpl-classic-elegant', key: 'classic-elegant', name: 'Classic Elegant', accentColor: '#9A7B4F' },
    couple: coupleRow ? mapCouple(coupleRow) : null,
    events: events.map((e) => ({
      id: String(e.id),
      title: String(e.title),
      category: String(e.category),
      eventDate: String(e.event_date),
      startTime: String(e.start_time),
      endTime: String(e.end_time || ''),
      timezone: String(e.timezone || 'WIB'),
      venueName: String(e.venue_name),
      venueAddress: String(e.venue_address),
      mapsUrl: String(e.maps_url || ''),
      mapsEmbedUrl: String(e.maps_embed_url || ''),
      dressCode: String(e.dress_code || ''),
      description: String(e.description || ''),
    })),
    stories: stories.map((s) => ({
      id: String(s.id),
      title: String(s.title),
      periodLabel: String(s.period_label),
      storyDate: String(s.story_date || ''),
      description: String(s.description),
      imageUrl: String(s.image_url || ''),
    })),
    galleries: galleries.map((g) => ({
      id: String(g.id),
      title: String(g.title),
      caption: String(g.caption || ''),
      imageUrl: String(g.image_url),
    })),
    wishes: wishes.map((w) => ({
      id: String(w.id),
      authorName: String(w.author_name),
      relationLabel: String(w.relation_label || ''),
      message: String(w.message),
      createdAt: String(w.created_at),
    })),
    giftAccounts: gifts.map((g) => ({
      id: String(g.id),
      bankName: String(g.bank_name),
      accountNumber: String(g.account_number),
      accountHolder: String(g.account_holder),
      qrImageUrl: String(g.qr_image_url || ''),
      notes: String(g.notes || ''),
    })),
    settings: settingsRow
      ? {
          rsvpEnabled: Number(settingsRow.rsvp_enabled) === 1,
          rsvpDeadline: String(settingsRow.rsvp_deadline || ''),
          wishesEnabled: Number(settingsRow.wishes_enabled) === 1,
          giftsEnabled: Number(settingsRow.gifts_enabled) === 1,
          musicEnabled: Number(settingsRow.music_enabled) === 1,
          galleryEnabled: Number(settingsRow.gallery_enabled) === 1,
          loveStoryEnabled: Number(settingsRow.love_story_enabled) === 1,
          footerText: String(settingsRow.footer_text || ''),
        }
      : {
          rsvpEnabled: true,
          rsvpDeadline: '',
          wishesEnabled: true,
          giftsEnabled: true,
          musicEnabled: true,
          galleryEnabled: true,
          loveStoryEnabled: true,
          footerText: '',
        },
  };
}

export function updateInvitation(input: z.infer<typeof updateInvitationSchema>): InvitationDto {
  const db = getDb();
  const invId = getSingleInvitationId(db);

  const tpl = db
    .prepare('SELECT id FROM templates WHERE id = ? AND is_active = 1 LIMIT 1')
    .get(input.templateId) as { id: string } | undefined;
  if (!tpl) {
    throw new NotFoundError('Template tidak ditemukan');
  }

  const conflictSlug = db
    .prepare('SELECT id FROM invitations WHERE slug = ? AND id != ? LIMIT 1')
    .get(input.slug, invId) as { id: string } | undefined;
  if (conflictSlug) {
    throw new ConflictError('Slug undangan sudah digunakan');
  }

  const timestamp = nowIso();
  db.prepare(
    `UPDATE invitations
     SET title = ?, slug = ?, template_id = ?, is_published = ?,
         hero_subtitle = ?, hero_image_url = ?, opening_quote = ?, opening_quote_author = ?,
         seo_title = ?, seo_description = ?, og_image_url = ?,
         music_url = ?, music_title = ?, is_music_enabled = ?,
         primary_date = ?, countdown_target = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.title,
    input.slug,
    input.templateId,
    input.isPublished ? 1 : 0,
    input.heroSubtitle,
    input.heroImageUrl,
    input.openingQuote,
    input.openingQuoteAuthor,
    input.seoTitle,
    input.seoDescription,
    input.ogImageUrl,
    input.musicUrl,
    input.musicTitle,
    input.isMusicEnabled ? 1 : 0,
    input.primaryDate,
    input.countdownTarget,
    timestamp,
    invId
  );

  const updated = db.prepare('SELECT * FROM invitations WHERE id = ?').get(invId) as Record<string, unknown>;
  return mapInvitation(updated);
}

export function updateCouple(input: z.infer<typeof updateCoupleSchema>): CoupleDto {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const timestamp = nowIso();

  db.prepare(
    `UPDATE couples
     SET groom_full_name = ?, groom_nick_name = ?, groom_parents = ?, groom_bio = ?, groom_instagram = ?, groom_photo_url = ?,
         bride_full_name = ?, bride_nick_name = ?, bride_parents = ?, bride_bio = ?, bride_instagram = ?, bride_photo_url = ?,
         updated_at = ?
     WHERE invitation_id = ?`
  ).run(
    input.groomFullName,
    input.groomNickName,
    input.groomParents,
    input.groomBio,
    input.groomInstagram,
    input.groomPhotoUrl,
    input.brideFullName,
    input.brideNickName,
    input.brideParents,
    input.brideBio,
    input.brideInstagram,
    input.bridePhotoUrl,
    timestamp,
    invId
  );

  const updated = db
    .prepare('SELECT * FROM couples WHERE invitation_id = ?')
    .get(invId) as Record<string, unknown>;
  return mapCouple(updated);
}

export function updateCouplePhoto(role: 'groom' | 'bride', photoUrl: string): CoupleDto {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const column = role === 'groom' ? 'groom_photo_url' : 'bride_photo_url';
  db.prepare(`UPDATE couples SET ${column} = ?, updated_at = ? WHERE invitation_id = ?`).run(
    photoUrl,
    nowIso(),
    invId
  );
  const updated = db
    .prepare('SELECT * FROM couples WHERE invitation_id = ?')
    .get(invId) as Record<string, unknown>;
  return mapCouple(updated);
}
