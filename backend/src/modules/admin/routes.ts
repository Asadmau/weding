import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { BadRequestError } from '../../common/errors.ts';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/response.ts';
import { getSingleInvitationId } from '../../common/validators.ts';
import { getDb } from '../../db/client.ts';
import { requireAdminAuth } from '../../middlewares/authMiddleware.ts';
import { validateBody } from '../../middlewares/validate.ts';
import { storageService } from '../../storage/storageService.ts';
import { getAdminDashboardStats } from '../dashboard/service.ts';
import {
  createEvent,
  deleteEvent,
  eventInputSchema,
  listEvents,
  updateEvent,
} from '../events/service.ts';
import {
  addGalleryItem,
  deleteGalleryItem,
  galleryMetadataSchema,
  listGalleries,
} from '../galleries/service.ts';
import {
  createGift,
  deleteGift,
  giftInputSchema,
  listGifts,
  updateGift,
} from '../gifts/service.ts';
import {
  createGuest,
  deleteGuest,
  guestInputSchema,
  guestQuerySchema,
  listGuests,
  regenerateGuestToken,
  updateGuest,
} from '../guests/service.ts';
import {
  getAdminInvitationBundle,
  updateCouple,
  updateCouplePhoto,
  updateInvitation,
} from '../invitations/service.ts';
import {
  selectTemplateSchema,
  updateCoupleSchema,
  updateInvitationSchema,
} from '../invitations/validation.ts';
import { exportRsvpsCsv, getRsvpSummaryAndList, rsvpQuerySchema } from '../rsvp/service.ts';
import { getSettings, settingsInputSchema, updateSettings } from '../settings/service.ts';
import {
  createStory,
  deleteStory,
  listStories,
  storyInputSchema,
  updateStory,
} from '../stories/service.ts';
import { activateTemplateForInvitation, listTemplates } from '../templates/service.ts';
import { deleteWish, listAdminWishes, moderateWish, wishQuerySchema } from '../wishes/service.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);

// Dashboard
adminRouter.get('/dashboard', (_req, res) => {
  return sendSuccess(res, getAdminDashboardStats());
});

// Invitation & Couple
adminRouter.get('/invitation', (_req, res) => {
  return sendSuccess(res, getAdminInvitationBundle());
});

adminRouter.put('/invitation', validateBody(updateInvitationSchema), (req, res) => {
  return sendSuccess(res, updateInvitation(req.body), 'Pengaturan undangan diperbarui');
});

adminRouter.put('/couple', validateBody(updateCoupleSchema), (req, res) => {
  return sendSuccess(res, updateCouple(req.body), 'Profil mempelai diperbarui');
});

adminRouter.post(
  '/couple/photo/:role',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const role = req.params.role;
    if (role !== 'groom' && role !== 'bride') {
      throw new BadRequestError('Role foto harus groom atau bride');
    }
    if (!req.file) {
      throw new BadRequestError('File foto wajib diunggah');
    }
    const stored = await storageService.saveImage(req.file);
    const couple = updateCouplePhoto(role, stored.publicUrl);
    return sendSuccess(res, couple, 'Foto mempelai berhasil diunggah');
  })
);

adminRouter.post(
  '/upload',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new BadRequestError('File gambar wajib diunggah');
    }
    const stored = await storageService.saveImage(req.file);
    return sendCreated(res, stored, 'Gambar berhasil diunggah');
  })
);

// Templates
adminRouter.get('/templates', (_req, res) => {
  const bundle = getAdminInvitationBundle();
  return sendSuccess(res, {
    activeTemplateId: bundle.invitation.templateId,
    templates: listTemplates(),
  });
});

adminRouter.put('/templates/active', validateBody(selectTemplateSchema), (req, res) => {
  const db = getDb();
  const invId = getSingleInvitationId(db);
  const template = activateTemplateForInvitation(invId, req.body.templateId);
  return sendSuccess(res, template, `Template "${template.name}" berhasil diaktifkan`);
});

// Events CRUD
adminRouter.get('/events', (_req, res) => {
  return sendSuccess(res, listEvents());
});

adminRouter.post('/events', validateBody(eventInputSchema), (req, res) => {
  return sendCreated(res, createEvent(req.body), 'Acara berhasil ditambahkan');
});

adminRouter.put('/events/:id', validateBody(eventInputSchema), (req, res) => {
  return sendSuccess(res, updateEvent(String(req.params.id), req.body), 'Acara diperbarui');
});

adminRouter.delete('/events/:id', (req, res) => {
  deleteEvent(String(req.params.id));
  return sendSuccess(res, { deleted: true }, 'Acara dihapus');
});

// Stories CRUD
adminRouter.get('/stories', (_req, res) => {
  return sendSuccess(res, listStories());
});

adminRouter.post('/stories', validateBody(storyInputSchema), (req, res) => {
  return sendCreated(res, createStory(req.body), 'Cerita cinta ditambahkan');
});

adminRouter.put('/stories/:id', validateBody(storyInputSchema), (req, res) => {
  return sendSuccess(res, updateStory(String(req.params.id), req.body), 'Cerita cinta diperbarui');
});

adminRouter.delete('/stories/:id', (req, res) => {
  deleteStory(String(req.params.id));
  return sendSuccess(res, { deleted: true }, 'Cerita cinta dihapus');
});

// Gallery CRUD & Upload
adminRouter.get('/gallery', (_req, res) => {
  return sendSuccess(res, listGalleries());
});

adminRouter.post(
  '/gallery',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const parsed = galleryMetadataSchema.parse(req.body);
    const created = await addGalleryItem(parsed, req.file);
    return sendCreated(res, created, 'Foto galeri berhasil ditambahkan');
  })
);

adminRouter.delete(
  '/gallery/:id',
  asyncHandler(async (req, res) => {
    await deleteGalleryItem(String(req.params.id));
    return sendSuccess(res, { deleted: true }, 'Foto galeri dihapus');
  })
);

// Guests CRUD & Token regeneration
adminRouter.get('/guests', (req, res) => {
  const query = guestQuerySchema.parse(req.query);
  const result = listGuests(query);
  return sendPaginated(res, result.items, result.meta);
});

adminRouter.post('/guests', validateBody(guestInputSchema), (req, res) => {
  return sendCreated(res, createGuest(req.body), 'Tamu berhasil ditambahkan');
});

adminRouter.put('/guests/:id', validateBody(guestInputSchema), (req, res) => {
  return sendSuccess(res, updateGuest(String(req.params.id), req.body), 'Data tamu diperbarui');
});

adminRouter.post('/guests/:id/regenerate-token', (req, res) => {
  return sendSuccess(
    res,
    regenerateGuestToken(String(req.params.id)),
    'Tautan undangan personal berhasil diperbarui'
  );
});

adminRouter.delete('/guests/:id', (req, res) => {
  deleteGuest(String(req.params.id));
  return sendSuccess(res, { deleted: true }, 'Tamu dihapus');
});

// RSVPs & CSV Export
adminRouter.get('/rsvps', (req, res) => {
  const query = rsvpQuerySchema.parse(req.query);
  return sendSuccess(res, getRsvpSummaryAndList(query));
});

adminRouter.get('/rsvps/export', (_req, res) => {
  const csv = exportRsvpsCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="wedding-rsvps.csv"');
  return res.status(200).send(csv);
});

// Wishes Moderation
adminRouter.get('/wishes', (req, res) => {
  const query = wishQuerySchema.parse(req.query);
  return sendSuccess(res, listAdminWishes(query));
});

adminRouter.patch('/wishes/:id/approve', (req, res) => {
  return sendSuccess(res, moderateWish(String(req.params.id), 'APPROVED'), 'Ucapan disetujui');
});

adminRouter.patch('/wishes/:id/reject', (req, res) => {
  return sendSuccess(res, moderateWish(String(req.params.id), 'REJECTED'), 'Ucapan ditolak');
});

adminRouter.delete('/wishes/:id', (req, res) => {
  deleteWish(String(req.params.id));
  return sendSuccess(res, { deleted: true }, 'Ucapan dihapus');
});

// Gifts CRUD
adminRouter.get('/gifts', (_req, res) => {
  return sendSuccess(res, listGifts());
});

adminRouter.post('/gifts', validateBody(giftInputSchema), (req, res) => {
  return sendCreated(res, createGift(req.body), 'Rekening hadiah ditambahkan');
});

adminRouter.put('/gifts/:id', validateBody(giftInputSchema), (req, res) => {
  return sendSuccess(res, updateGift(String(req.params.id), req.body), 'Rekening hadiah diperbarui');
});

adminRouter.delete('/gifts/:id', (req, res) => {
  deleteGift(String(req.params.id));
  return sendSuccess(res, { deleted: true }, 'Rekening hadiah dihapus');
});

// Settings
adminRouter.get('/settings', (_req, res) => {
  return sendSuccess(res, getSettings());
});

adminRouter.put('/settings', validateBody(settingsInputSchema), (req, res) => {
  return sendSuccess(res, updateSettings(req.body), 'Pengaturan situs diperbarui');
});
