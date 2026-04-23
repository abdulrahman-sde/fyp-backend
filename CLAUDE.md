# HireFlow Backend — Architecture Rules

## Layer Architecture

Every feature module follows a strict 4-layer stack. No layer may skip a layer below it.

```
Controller → Service → DAL → Prisma
```

| Layer | File | Responsibility |
|---|---|---|
| Controller | `*.controller.ts` | Parse/validate request, call service, send response |
| Service | `*.service.ts` | Business logic only — no Prisma imports |
| DAL | `*.dal.ts` | All database queries — the only place Prisma is used |
| Validator | `*.validator.ts` | Zod schemas — single source of truth for input shapes |

---

## Types

### Input types → inferred from Zod in `*.types.ts`

```ts
// ✅ CORRECT — types derived from the validator, never duplicated
import type { z } from "zod";
import type { registerSchema } from "./auth.validator.js";

export type RegisterInput = z.infer<typeof registerSchema>;
```

```ts
// ❌ WRONG — hand-writing an interface that mirrors a Zod schema
export interface RegisterInput {
  email: string;
  password: string;
}
```

### Database types → use Prisma-generated types in the repository layer

```ts
// ✅ CORRECT — repository uses Prisma types directly
import type { User, Prisma } from "../../generated/prisma/client.js";

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data });
}
```

```ts
// ❌ WRONG — re-inventing Prisma shapes in a service or type file
export interface CreateUserData {
  email: string;
  password: string;
  role: string;
}
```

---

## DAL Rules

- **All Prisma calls live exclusively in `*.dal.ts` files.**
- Services import from the DAL, never from `prisma` directly.
- DAL functions are named after the operation: `findUserByEmail`, `createRefreshToken`, `revokeRefreshToken`.
- Use `Prisma.*CreateInput` / `Prisma.*UpdateInput` types for write parameters.
- Transactions belong in the DAL — wrap multi-step writes in `prisma.$transaction`.

```ts
// ✅ CORRECT
import * as repo from "./auth.dal.js";

const user = await repo.findUserByEmail(email);
```

```ts
// ❌ WRONG — Prisma used directly in a service
import { prisma } from "../../lib/prisma.js";

const user = await prisma.user.findUnique({ where: { email } });
```

---

## Response Format

Every HTTP response follows this exact shape. Use the helpers in `shared/response.ts` — never call `res.json()` manually in a controller.

```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "code": "...", "details": [...] }
```

```ts
// ✅ CORRECT — use shared helpers
import { ok, created, noContent } from "../../shared/response.js";

return ok(res, { user });
return created(res, { user }, "Account created successfully");
return noContent(res);
```

```ts
// ❌ WRONG — raw res.json() in a controller
res.json({ success: true, data: { user } });
res.status(201).json({ id: user.id });
```

Error responses are handled centrally in `error.middleware.ts` — throw an `AppError` subclass from anywhere and the middleware formats it.

---

## Validation

- All request body validation happens in the **controller** via `zodSchema.parse(req.body)`.
- Never pass raw `req.body` to a service.
- The parsed, typed value is what gets forwarded to the service.

```ts
// ✅ CORRECT
const input = registerSchema.parse(req.body); // throws ZodError → caught by errorMiddleware
const result = await authService.register(input);
```

---

## Module Structure

Each feature module lives in `src/module/<name>/` and contains exactly:

```
auth.controller.ts   — request/response only
auth.routes.ts       — Express router
auth.service.ts      — business logic, no Prisma
auth.dal.ts          — all DB queries, Prisma types
auth.validator.ts    — Zod schemas
auth.types.ts        — types inferred from Zod + output DTOs
```

---

## Shared Utilities

| Path | Use for |
|---|---|
| `shared/errors.ts` | Throw `AppError` subclasses (`UnauthorizedError`, `ConflictError`, etc.) |
| `shared/response.ts` | `ok()`, `created()`, `noContent()` |
| `shared/constants.ts` | Token expiry, cookie names |
| `shared/types.ts` | Cross-cutting types (`JwtPayload`, Express augmentation) |
| `utils/asyncHandler.ts` | Wrap async route handlers |
