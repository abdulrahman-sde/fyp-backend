import { defineConfig, env } from "prisma/config";
import "dotenv/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"), // postgres://user:pass@host:5432/db
  },
});
