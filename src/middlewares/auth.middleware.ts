import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAMES } from "../shared/constants.js";
import { UnauthorizedError } from "../shared/errors.js";
import type { JwtPayload } from "../shared/types.js";

const JWT_SECRET = process.env.JWT_SECRET!;

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS] as string | undefined;
  if (!token) return next(new UnauthorizedError("Authentication required"));

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new UnauthorizedError("Insufficient permissions"));
    }
    next();
  };
}
