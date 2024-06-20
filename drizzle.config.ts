import type { Config } from "drizzle-kit";

export default {
  schema: "./app/db/schema.server.ts",
  out: "./app/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://myuser:mysecretpassword@localhost:5432/mydatabase",
  },
} satisfies Config;
