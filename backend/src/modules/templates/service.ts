import { NotFoundError } from '../../common/errors.ts';
import { getDb, nowIso } from '../../db/client.ts';

export interface TemplateDto {
  id: string;
  key: string;
  name: string;
  description: string;
  previewImageUrl: string;
  accentColor: string;
  isActive: boolean;
  sortOrder: number;
}

interface TemplateRow {
  id: string;
  key: string;
  name: string;
  description: string;
  preview_image_url: string;
  accent_color: string;
  is_active: number;
  sort_order: number;
}

function mapTemplate(row: TemplateRow): TemplateDto {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    previewImageUrl: row.preview_image_url,
    accentColor: row.accent_color,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
  };
}

export function listTemplates(): TemplateDto[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM templates WHERE is_active = 1 ORDER BY sort_order ASC, name ASC')
    .all() as unknown as TemplateRow[];
  return rows.map(mapTemplate);
}

export function getTemplateByIdOrKey(idOrKey: string): TemplateDto {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM templates WHERE id = ? OR key = ? LIMIT 1')
    .get(idOrKey, idOrKey) as unknown as TemplateRow | undefined;
  if (!row) {
    throw new NotFoundError('Template undangan tidak ditemukan');
  }
  return mapTemplate(row);
}

export function activateTemplateForInvitation(invitationId: string, templateId: string): TemplateDto {
  const db = getDb();
  const tpl = db
    .prepare('SELECT * FROM templates WHERE id = ? AND is_active = 1 LIMIT 1')
    .get(templateId) as unknown as TemplateRow | undefined;

  if (!tpl) {
    throw new NotFoundError('Template tidak ditemukan atau tidak aktif');
  }

  db.prepare('UPDATE invitations SET template_id = ?, updated_at = ? WHERE id = ?').run(
    tpl.id,
    nowIso(),
    invitationId
  );

  return mapTemplate(tpl);
}
