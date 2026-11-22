import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../common/errors.ts';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirimkan tidak valid',
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file melebihi batas maksimal 5 MB'
        : 'Gagal memproses file unggahan';
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message,
      },
    });
  }

  const sqlErr = err as { code?: string; message?: string };
  if (sqlErr?.code === 'ERR_SQLITE_ERROR' && sqlErr.message?.includes('UNIQUE constraint')) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Data unik sudah digunakan',
      },
    });
  }

  console.error('[Server Error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
    },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    },
  });
}
