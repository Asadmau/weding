import { z } from 'zod';
import { getSingleInvitationId } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const settingsInputSchema = z.object({
  rsvpEnabled: z.boolean(),
  rsvpDeadline: z.string().trim().max(40).default(''),
  wishesEnabled: z.boolean(),
  wishesAutoApprove: z.boolean(),
  giftsEnabled: z.boolean(),
  musicEnabled: z.boolean(),
  galleryEnabled: z.boolean(),
  loveStoryEnabled: z.boolean(),
  whatsappTemplate: z.string().trim().max(2000).default(''),
  footerText: z.string().trim().max(300).default(''),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

function mapSettings(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    rsvpEnabled: Number(row.rsvp_enabled) === 1,
    rsvpDeadline: String(row.rsvp_deadline || ''),
    wishesEnabled: Number(row.wishes_enabled) === 1,
    wishesAutoApprove: Number(row.wishes_auto_approve) === 1,
    giftsEnabled: Number(row.gifts_enabled) === 1,
    musicEnabled: Number(row.music_enabled) === 1,
    galleryEnabled: Number(row.gallery_enabled) === 1,
    loveStoryEnabled: Number(row.love_story_enabled) === 1,
    whatsappTemplate: String(row.whatsapp_template || ''),
    footerText: String(row.footer_text || ''),
  };
}

export function getSettings() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const row = db
    .prepare('SELECT * FROM site_settings WHERE invitation_id = ? LIMIT 1')
    .get(invId) as Record<string, unknown>;
  return mapSettings(row);
}

export function updateSettings(input: SettingsInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);

  db.prepare(
    `UPDATE site_settings
     SET rsvp_enabled = ?, rsvp_deadline = ?, wishes_enabled = ?, wishes_auto_approve = ?,
         gifts_enabled = ?, music_enabled = ?, gallery_enabled = ?, love_story_enabled = ?,
         whatsapp_template = ?, footer_text = ?, updated_at = ?
     WHERE invitation_id = ?`
  ).run(
    input.rsvpEnabled ? 1 : 0,
    input.rsvpDeadline,
    input.wishesEnabled ? 1 : 0,
    input.wishesAutoApprove ? 1 : 0,
    input.giftsEnabled ? 1 : 0,
    input.musicEnabled ? 1 : 0,
    input.galleryEnabled ? 1 : 0,
    input.loveStoryEnabled ? 1 : 0,
    input.whatsappTemplate,
    input.footerText,
    nowIso(),
    invId
  );

  return getSettings();
}
