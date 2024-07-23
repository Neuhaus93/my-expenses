import { ActionFunctionArgs, json } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { transactions } from "~/db/schema.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    id: z.coerce.number().int(),
  });
  const { id } = formSchema.parse(formObj);
  await db.delete(transactions).where(eq(transactions.id, id));

  return json({ ok: true });
}
