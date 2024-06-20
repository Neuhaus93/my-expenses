import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "~/db/schema.server";

const client = new pg.Client({
  connectionString:
    "postgresql://myuser:mysecretpassword@localhost:5432/mydatabase",
});

await client.connect();
export const db = drizzle(client, { schema });
