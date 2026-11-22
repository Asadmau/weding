import crypto from 'node:crypto';
import {
  generateSecureToken,
  hashPassword,
  sha256,
  verifyPassword,
} from '../../common/crypto.ts';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../common/errors.ts';
import { env } from '../../config/env.ts';
import { getDb, nowIso, withTransaction } from '../../db/client.ts';
import type { LoginInput, SetupAdminInput } from './validation.ts';

export interface AdminPublic {
  id: string;
  email: string;
  name: string;
}

export interface SessionCreateResult {
  admin: AdminPublic;
  rawToken: string;
  csrfToken: string;
  expiresAt: Date;
}

export function hasAnyAdmin(): boolean {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM admins WHERE is_active = 1').get() as {
    count: number;
  };
  return row.count > 0;
}

function createAdminSession(
  admin: AdminPublic,
  meta: { userAgent?: string; ipAddress?: string }
): SessionCreateResult {
  const db = getDb();
  const rawToken = generateSecureToken(32);
  const tokenHash = sha256(rawToken);
  const csrfToken = generateSecureToken(24);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
  const timestamp = nowIso();

  // Prune expired sessions opportunistically
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(timestamp);

  db.prepare(
    `INSERT INTO sessions (id, admin_id, token_hash, csrf_token, expires_at, user_agent, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    admin.id,
    tokenHash,
    csrfToken,
    expiresAt.toISOString(),
    meta.userAgent || '',
    meta.ipAddress || '',
    timestamp
  );

  return { admin, rawToken, csrfToken, expiresAt };
}

export async function setupInitialAdmin(
  input: SetupAdminInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<SessionCreateResult> {
  if (env.adminPassword) {
    throw new ForbiddenError('Akun administrator dikelola melalui environment variable');
  }

  const passwordHash = await hashPassword(input.password);
  const timestamp = nowIso();
  const adminId = crypto.randomUUID();
  const normalizedEmail = input.email.toLowerCase();

  const admin = withTransaction((tx) => {
    const countRow = tx.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    if (countRow.count > 0) {
      throw new ConflictError('Akun administrator sudah pernah dibuat');
    }

    tx.prepare(
      `INSERT INTO admins (id, email, name, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    ).run(adminId, normalizedEmail, input.name, passwordHash, timestamp, timestamp);

    return {
      id: adminId,
      email: normalizedEmail,
      name: input.name,
    };
  });

  return createAdminSession(admin, meta);
}

export async function loginAdmin(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<SessionCreateResult> {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, email, name, password_hash, is_active FROM admins WHERE email = ? LIMIT 1'
    )
    .get(input.email.toLowerCase()) as
    | {
        id: string;
        email: string;
        name: string;
        password_hash: string;
        is_active: number;
      }
    | undefined;

  if (!row || row.is_active !== 1) {
    throw new UnauthorizedError('Email atau password salah');
  }

  const valid = await verifyPassword(input.password, row.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Email atau password salah');
  }

  return createAdminSession(
    { id: row.id, email: row.email, name: row.name },
    meta
  );
}

export function logoutSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
