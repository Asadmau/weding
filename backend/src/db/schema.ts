import crypto from 'node:crypto';
import { getDb } from './client.ts';

export function initializeSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      csrf_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      preview_image_url TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      template_id TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      hero_subtitle TEXT NOT NULL DEFAULT '',
      hero_image_url TEXT NOT NULL DEFAULT '',
      opening_quote TEXT NOT NULL DEFAULT '',
      opening_quote_author TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      og_image_url TEXT NOT NULL DEFAULT '',
      music_url TEXT NOT NULL DEFAULT '',
      music_title TEXT NOT NULL DEFAULT '',
      is_music_enabled INTEGER NOT NULL DEFAULT 1,
      primary_date TEXT NOT NULL,
      countdown_target TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );
    CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);

    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL UNIQUE,
      groom_full_name TEXT NOT NULL,
      groom_nick_name TEXT NOT NULL,
      groom_parents TEXT NOT NULL DEFAULT '',
      groom_bio TEXT NOT NULL DEFAULT '',
      groom_instagram TEXT NOT NULL DEFAULT '',
      groom_photo_url TEXT NOT NULL DEFAULT '',
      bride_full_name TEXT NOT NULL,
      bride_nick_name TEXT NOT NULL,
      bride_parents TEXT NOT NULL DEFAULT '',
      bride_bio TEXT NOT NULL DEFAULT '',
      bride_instagram TEXT NOT NULL DEFAULT '',
      bride_photo_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'CEREMONY',
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'WIB',
      venue_name TEXT NOT NULL,
      venue_address TEXT NOT NULL,
      maps_url TEXT NOT NULL DEFAULT '',
      maps_embed_url TEXT NOT NULL DEFAULT '',
      dress_code TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_events_invitation_id ON events(invitation_id);

    CREATE TABLE IF NOT EXISTS love_stories (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      title TEXT NOT NULL,
      period_label TEXT NOT NULL,
      story_date TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_love_stories_invitation_id ON love_stories(invitation_id);

    CREATE TABLE IF NOT EXISTS galleries (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      storage_key TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      file_size INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_galleries_invitation_id ON galleries(invitation_id);

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      group_name TEXT NOT NULL DEFAULT 'Umum',
      max_guests INTEGER NOT NULL DEFAULT 2,
      guest_slug TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      token_encrypted TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_guests_invitation_id ON guests(invitation_id);
    CREATE INDEX IF NOT EXISTS idx_guests_token_hash ON guests(token_hash);

    CREATE TABLE IF NOT EXISTS rsvps (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_id TEXT UNIQUE,
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL DEFAULT '',
      attendance_status TEXT NOT NULL CHECK (attendance_status IN ('ATTENDING', 'NOT_ATTENDING', 'PENDING')),
      guest_count INTEGER NOT NULL DEFAULT 1,
      message TEXT NOT NULL DEFAULT '',
      edit_token_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON rsvps(invitation_id);
    CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(attendance_status);

    CREATE TABLE IF NOT EXISTS wishes (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      guest_id TEXT,
      author_name TEXT NOT NULL,
      relation_label TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      moderated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wishes_invitation_status ON wishes(invitation_id, status);

    CREATE TABLE IF NOT EXISTS gift_accounts (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      qr_image_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_gift_accounts_invitation_id ON gift_accounts(invitation_id);

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL UNIQUE,
      rsvp_enabled INTEGER NOT NULL DEFAULT 1,
      rsvp_deadline TEXT NOT NULL DEFAULT '',
      wishes_enabled INTEGER NOT NULL DEFAULT 1,
      wishes_auto_approve INTEGER NOT NULL DEFAULT 0,
      gifts_enabled INTEGER NOT NULL DEFAULT 1,
      music_enabled INTEGER NOT NULL DEFAULT 1,
      gallery_enabled INTEGER NOT NULL DEFAULT 1,
      love_story_enabled INTEGER NOT NULL DEFAULT 1,
      whatsapp_template TEXT NOT NULL DEFAULT '',
      footer_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    );
  `);

  // Backward-compatible migration: add personalized guest slugs to existing databases.
  const guestColumns = db.prepare('PRAGMA table_info(guests)').all() as Array<{ name: string }>;
  if (!guestColumns.some((column) => column.name === 'guest_slug')) {
    db.exec('ALTER TABLE guests ADD COLUMN guest_slug TEXT');
  }

  const guestsWithoutSlug = db
    .prepare('SELECT id, invitation_id, full_name FROM guests WHERE guest_slug IS NULL OR guest_slug = \'\'')
    .all() as Array<{ id: string; invitation_id: string; full_name: string }>;

  const updateGuestSlug = db.prepare('UPDATE guests SET guest_slug = ? WHERE id = ?');
  const findSlug = db.prepare(
    'SELECT id FROM guests WHERE invitation_id = ? AND guest_slug = ? LIMIT 1'
  );

  for (const guest of guestsWithoutSlug) {
    const base = guest.full_name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/g, '') || 'tamu';

    let guestSlug = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guestSlug = `${base}-${crypto.randomBytes(8).toString('hex')}`;
      if (!findSlug.get(guest.invitation_id, guestSlug)) break;
      guestSlug = '';
    }
    if (!guestSlug) {
      throw new Error(`Gagal membuat slug unik untuk tamu ${guest.id}`);
    }
    updateGuestSlug.run(guestSlug, guest.id);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_invitation_guest_slug
    ON guests(invitation_id, guest_slug)
    WHERE guest_slug IS NOT NULL;
  `);
}
