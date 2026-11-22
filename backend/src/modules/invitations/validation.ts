import { z } from 'zod';
import { safeMediaUrlSchema } from '../../common/validators.ts';

export const updateInvitationSchema = z.object({
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(150),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug minimal 3 karakter')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  templateId: z.string().trim().min(1),
  isPublished: z.boolean(),
  heroSubtitle: z.string().trim().max(500).default(''),
  heroImageUrl: safeMediaUrlSchema.default(''),
  openingQuote: z.string().trim().max(800).default(''),
  openingQuoteAuthor: z.string().trim().max(150).default(''),
  seoTitle: z.string().trim().max(160).default(''),
  seoDescription: z.string().trim().max(320).default(''),
  ogImageUrl: safeMediaUrlSchema.default(''),
  musicUrl: safeMediaUrlSchema.default(''),
  musicTitle: z.string().trim().max(150).default(''),
  isMusicEnabled: z.boolean().default(true),
  primaryDate: z.string().trim().min(4).max(40),
  countdownTarget: z.string().trim().min(4).max(60),
});

export const updateCoupleSchema = z.object({
  groomFullName: z.string().trim().min(2).max(120),
  groomNickName: z.string().trim().min(1).max(60),
  groomParents: z.string().trim().max(250).default(''),
  groomBio: z.string().trim().max(600).default(''),
  groomInstagram: z.string().trim().max(80).default(''),
  groomPhotoUrl: safeMediaUrlSchema.default(''),
  brideFullName: z.string().trim().min(2).max(120),
  brideNickName: z.string().trim().min(1).max(60),
  brideParents: z.string().trim().max(250).default(''),
  brideBio: z.string().trim().max(600).default(''),
  brideInstagram: z.string().trim().max(80).default(''),
  bridePhotoUrl: safeMediaUrlSchema.default(''),
});

export const selectTemplateSchema = z.object({
  templateId: z.string().trim().min(1, 'Template harus dipilih'),
});
