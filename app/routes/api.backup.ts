import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import dayjs from "dayjs";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "~/db/config.server";
import * as schema from "~/db/schema.server";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw new Error("Not logged in");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  for (const [key, value] of Object.entries(schema)) {
    console.log(`key: ${key} | isTable: ${value instanceof PgTable}`);
    if (value instanceof PgTable) {
      const tableRows = await db.select().from(value);
      res[key] = tableRows;
    }
  }
  const date = dayjs().format("YYYY-MM-DD_HH:mm");

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=expenses-${date}.json`,
    },
  });
}
