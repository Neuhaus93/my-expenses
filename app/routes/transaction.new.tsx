import { ActionFunctionArgs, json } from "@remix-run/node";
import { db } from "~/db/config.server";
import { transactions } from "~/db/schema.server";
import { z } from "zod";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    category: z.coerce.number().int(),
    value: z.coerce.number(),
  });

  const { category: categoryId, value } = formSchema.parse(formObj);
  const cents = Math.floor(value * 100);

  await db.insert(transactions).values({
    type: "expense",
    timestamp: new Date(),
    userId: "user_2i7ipp18qElWdqGJFl9z5oZyL04",
    categoryId,
    cents,
  });

  return json({ ok: true });
}
