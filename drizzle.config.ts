import type { Config } from "drizzle-kit";
import { env } from "~/env.server";

export default {
  schema: "./app/db/schema.server.ts",
  out: "./app/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
} satisfies Config;
