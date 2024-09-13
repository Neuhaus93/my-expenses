import { z } from "zod";

const envSchema = z.object({
  SECRET: z.string(),
  DATABASE_URL: z.string(),
});

// eslint-disable-next-line no-undef
export const env = envSchema.parse(process.env);
