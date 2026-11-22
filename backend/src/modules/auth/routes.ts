import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAdminAuth } from '../../middlewares/authMiddleware.ts';
import { loginRateLimiter } from '../../middlewares/rateLimiter.ts';
import { validateBody } from '../../middlewares/validate.ts';
import {
  getAuthStatus,
  loginController,
  logoutController,
  meController,
  setupAdminController,
} from './controller.ts';
import { loginSchema, setupAdminSchema } from './validation.ts';

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const authRouter = Router();

authRouter.get('/status', getAuthStatus);
authRouter.post(
  '/setup',
  loginRateLimiter,
  validateBody(setupAdminSchema),
  asyncHandler(setupAdminController)
);
authRouter.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(loginController)
);
authRouter.post('/logout', logoutController);
authRouter.get('/me', requireAdminAuth, meController);
