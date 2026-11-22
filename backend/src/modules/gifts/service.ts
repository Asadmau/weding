import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { getDb, nowIso } from '../../db/client.ts';

export const giftInputSchema = z.object({
  bankName: z.string().trim().min(2, 'Nama bank/dompet digital wajib diisi').max(100),
  accountNumber: z.string().trim().min(4, 'Nomor rekening wajib diisi').max(60),
  accountHolder: z.string().trim().min(2, 'Nama pemilik rekening wajib diisi').max(120),
  qrImageUrl: safeMediaUrlSchema.default(''),
  notes: z.string().trim().max(300).default(''),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

export type GiftInput = z.infer<typeof giftInputSchema>;

function mapGift(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    bankName: String(row.bank_name),
    accountNumber: String(row.account_number),
    accountHolder: String(row.account_holder),
    qrImageUrl: String(row.qr_image_url || ''),
    notes: String(row.notes || ''),
    sortOrder: Number(row.sort_order),
    isActive: Number(row.is_active) === 1,
  };
}

export function listGifts() {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const rows = db
    .prepare('SELECT * FROM gift_accounts WHERE invitation_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(invId) as Record<string, unknown>[];
  return rows.map(mapGift);
}

export function createGift(input: GiftInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO gift_accounts (
      id, invitation_id, bank_name, account_number, account_holder, qr_image_url, notes, sort_order, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    invId,
    input.bankName,
    input.accountNumber,
    input.accountHolder,
    input.qrImageUrl,
    input.notes,
    input.sortOrder,
    input.isActive ? 1 : 0,
    timestamp,
    timestamp
  );

  const row = db.prepare('SELECT * FROM gift_accounts WHERE id = ?').get(id) as Record<string, unknown>;
  return mapGift(row);
}

export function updateGift(id: string, input: GiftInput) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const existing = db
    .prepare('SELECT id FROM gift_accounts WHERE id = ? AND invitation_id = ?')
    .get(id, invId);
  if (!existing) {
    throw new NotFoundError('Rekening hadiah tidak ditemukan');
  }

  db.prepare(
    `UPDATE gift_accounts
     SET bank_name = ?, account_number = ?, account_holder = ?, qr_image_url = ?, notes = ?, sort_order = ?, is_active = ?, updated_at = ?
     WHERE id = ? AND invitation_id = ?`
  ).run(
    input.bankName,
    input.accountNumber,
    input.accountHolder,
    input.qrImageUrl,
    input.notes,
    input.sortOrder,
    input.isActive ? 1 : 0,
    nowIso(),
    id,
    invId
  );

  const row = db.prepare('SELECT * FROM gift_accounts WHERE id = ?').get(id) as Record<string, unknown>;
  return mapGift(row);
}

export function deleteGift(id: string) {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const result = db
    .prepare('DELETE FROM gift_accounts WHERE id = ? AND invitation_id = ?')
    .run(id, invId);
  if (result.changes === 0) {
    throw new NotFoundError('Rekening hadiah tidak ditemukan');
  }
}
