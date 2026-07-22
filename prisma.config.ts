import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Runtime uses the pooled Neon URL; Prisma CLI uses a direct URL when it is
    // supplied, while preserving the existing local DATABASE_URL-only workflow.
    url: process.env.DIRECT_URL || env("DATABASE_URL"),
  },
});
