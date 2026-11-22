import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../common/response.ts';
import {
  clearSessionCookie,
  resolveSessionFromRequest,
  setSessionCookie,
  type AdminRequest,
} from '../../middlewares/authMiddleware.ts';
import { hasAnyAdmin, loginAdmin, logoutSession, setupInitialAdmin } from './service.ts';

export function getAuthStatus(req: Request, res: Response) {
  const sessionAdmin = resolveSessionFromRequest(req);
  const adminExists = hasAnyAdmin();

  return sendSuccess(res, {
    needsSetup: !adminExists,
    authenticated: Boolean(sessionAdmin),
    admin: sessionAdmin
      ? {
          id: sessionAdmin.id,
          email: sessionAdmin.email,
          name: sessionAdmin.name,
        }
      : null,
    csrfToken: sessionAdmin?.csrfToken ?? null,
  });
}

export async function setupAdminController(req: Request, res: Response) {
  const result = await setupInitialAdmin(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  setSessionCookie(req, res, result.rawToken, result.expiresAt);
  return sendCreated(
    res,
    {
      admin: result.admin,
      csrfToken: result.csrfToken,
    },
    'Akun administrator berhasil dibuat'
  );
}

export async function loginController(req: Request, res: Response) {
  const result = await loginAdmin(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  setSessionCookie(req, res, result.rawToken, result.expiresAt);
  return sendSuccess(
    res,
    {
      admin: result.admin,
      csrfToken: result.csrfToken,
    },
    'Login berhasil'
  );
}

export function logoutController(req: AdminRequest, res: Response) {
  const admin = resolveSessionFromRequest(req);
  if (admin) {
    logoutSession(admin.sessionId);
  }
  clearSessionCookie(req, res);
  return sendSuccess(res, { loggedOut: true }, 'Logout berhasil');
}

export function meController(req: AdminRequest, res: Response) {
  const admin = req.admin!;
  return sendSuccess(res, {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
    csrfToken: admin.csrfToken,
  });
}
