import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "~/db/schema.server";
import { env } from "~/env.server";

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
});

await client.connect();
export const db = drizzle(client, { schema });
