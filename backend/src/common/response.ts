import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(res: Response, data: T, message = 'Berhasil dibuat') {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  message?: string
) {
  const payload: ApiSuccessResponse<T[]> = {
    success: true,
    ...(message ? { message } : {}),
    data: items,
    meta,
  };
  return res.status(200).json(payload);
}
