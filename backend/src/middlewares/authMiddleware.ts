import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { sha256 } from '../common/crypto.ts';
import { ForbiddenError, UnauthorizedError } from '../common/errors.ts';
import { getDb, nowIso } from '../db/client.ts';

export const SESSION_COOKIE_NAME = 'wedding_admin_session';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  sessionId: string;
  csrfToken: string;
}

export interface AdminRequest extends Request {
  admin?: AuthenticatedAdmin;
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return req.secure;
}

export function setSessionCookie(req: Request, res: Response, rawToken: string, expiresAt: Date): void {
  const isHttps = isHttpsRequest(req);
  const maxAgeSec = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = isHttpsRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
  ];
  if (isHttps) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function resolveSessionFromRequest(req: Request): AuthenticatedAdmin | null {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = sha256(rawToken);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id as session_id, s.csrf_token, s.expires_at, a.id as admin_id, a.email, a.name, a.is_active
       FROM sessions s
       INNER JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as
    | {
        session_id: string;
        csrf_token: string;
        expires_at: string;
        admin_id: string;
        email: string;
        name: string;
        is_active: number;
      }
    | undefined;

  if (!row || row.is_active !== 1) {
    return null;
  }

  if (row.expires_at <= nowIso()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
    return null;
  }

  return {
    id: row.admin_id,
    email: row.email,
    name: row.name,
    sessionId: row.session_id,
    csrfToken: row.csrf_token,
  };
}

export function requireAdminAuth(req: AdminRequest, _res: Response, next: NextFunction) {
  const admin = resolveSessionFromRequest(req);
  if (!admin) {
    return next(new UnauthorizedError('Silakan login sebagai administrator'));
  }

  // Enforce CSRF check on state-changing requests
  const method = req.method.toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfHeader = req.headers['x-csrf-token'];
    const expected = Buffer.from(admin.csrfToken, 'utf8');
    const actual = typeof csrfHeader === 'string' ? Buffer.from(csrfHeader, 'utf8') : null;

    const csrfValid =
      actual !== null &&
      actual.length === expected.length &&
      crypto.timingSafeEqual(actual, expected);

    if (!csrfValid) {
      return next(new ForbiddenError('Token CSRF tidak valid atau hilang'));
    }

    // Verify Origin/Host match when Origin header is present
    const origin = req.headers.origin;
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const expectedHost =
          (typeof req.headers['x-forwarded-host'] === 'string'
            ? req.headers['x-forwarded-host'].split(',')[0].trim()
            : undefined) || req.headers.host;
        if (expectedHost && originHost !== expectedHost) {
          return next(new ForbiddenError('Origin permintaan tidak diizinkan'));
        }
      } catch {
        return next(new ForbiddenError('Format Origin tidak valid'));
      }
    }
  }

  req.admin = admin;
  return next();
}
