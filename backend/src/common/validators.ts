import { z } from 'zod';

export const safeMediaUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (val) => {
      if (val === '') return true;
      if (val.startsWith('/') && !val.startsWith('//')) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL harus berupa path relatif (/) atau protokol http/https yang valid' }
  );

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
});

export function getSingleInvitationId(db: import('node:sqlite').DatabaseSync): string {
  const row = db.prepare('SELECT id FROM invitations LIMIT 1').get() as { id: string } | undefined;
  if (!row) {
    throw new Error('Default invitation record is missing');
  }
  return row.id;
}
