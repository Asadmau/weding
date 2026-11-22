import { Router } from 'express';
import { sendCreated, sendSuccess } from '../../common/response.ts';
import { publicSubmissionRateLimiter } from '../../middlewares/rateLimiter.ts';
import { validateBody } from '../../middlewares/validate.ts';
import { resolvePublicGuestBySlug, resolvePublicGuestByToken } from '../guests/service.ts';
import { getDefaultPublicSlug, getPublicInvitationBySlug } from '../invitations/service.ts';
import { publicRsvpSchema, submitPublicRsvp } from '../rsvp/service.ts';
import { getTemplateByIdOrKey, listTemplates } from '../templates/service.ts';
import { publicWishSchema, submitPublicWish } from '../wishes/service.ts';

export const publicRouter = Router();

publicRouter.get('/health', (_req, res) => {
  return sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

publicRouter.get('/templates', (_req, res) => {
  return sendSuccess(res, listTemplates());
});

publicRouter.get('/templates/:idOrKey', (req, res) => {
  return sendSuccess(res, getTemplateByIdOrKey(req.params.idOrKey));
});

publicRouter.get('/invitations/default', (_req, res) => {
  const slug = getDefaultPublicSlug();
  return sendSuccess(res, getPublicInvitationBySlug(slug));
});

publicRouter.get('/invitations/:slug', (req, res) => {
  return sendSuccess(res, getPublicInvitationBySlug(req.params.slug));
});

publicRouter.get('/invitations/:slug/guests/by-slug/:guestSlug', (req, res) => {
  return sendSuccess(res, resolvePublicGuestBySlug(req.params.slug, req.params.guestSlug));
});

// Backward compatibility for previously distributed token-based invitation links.
publicRouter.get('/invitations/:slug/guests/:token', (req, res) => {
  return sendSuccess(res, resolvePublicGuestByToken(req.params.slug, req.params.token));
});

publicRouter.post(
  '/public/rsvp',
  publicSubmissionRateLimiter,
  validateBody(publicRsvpSchema),
  (req, res) => {
    const result = submitPublicRsvp(req.body);
    return sendCreated(res, result, 'Konfirmasi kehadiran berhasil disimpan');
  }
);

publicRouter.post(
  '/public/wishes',
  publicSubmissionRateLimiter,
  validateBody(publicWishSchema),
  (req, res) => {
    const result = submitPublicWish(req.body);
    return sendCreated(
      res,
      result,
      result.status === 'APPROVED'
        ? 'Ucapan Anda telah dipublikasikan'
        : 'Ucapan Anda telah diterima dan menunggu moderasi'
    );
  }
);
