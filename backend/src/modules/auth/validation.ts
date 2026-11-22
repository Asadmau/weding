import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid').max(180),
  password: z.string().min(6, 'Password minimal 6 karakter').max(128),
});

export const setupAdminSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().trim().email('Format email tidak valid').max(180),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupAdminInput = z.infer<typeof setupAdminSchema>;
