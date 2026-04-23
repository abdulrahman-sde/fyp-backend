import type { Role } from "../generated/prisma/client.js";

export interface JwtPayload {
  sub: string;   // user id
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
