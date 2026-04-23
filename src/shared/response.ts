import type { Response } from "express";

export function ok<T>(res: Response, data: T, message = "Data retrieved successfully") {
  return res.status(200).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T, message = "Resource created successfully") {
  return res.status(201).json({ success: true, message, data });
}

export function noContent(res: Response) {
  return res.status(204).end();
}
