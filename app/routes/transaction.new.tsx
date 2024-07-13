import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { db } from "~/db/config.server";
import { transactions } from "~/db/schema.server";
import { z } from "zod";
import { getAuth } from "@clerk/remix/ssr.server";

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    category: z.coerce.number().int(),
    wallet: z.coerce.number().int(),
    value: z.coerce.number(),
    type: z.enum(["expense", "income"]),
    timestamp: z.coerce.date(),
  });

  const {
    type,
    category: categoryId,
    wallet: walletId,
    value,
    timestamp,
  } = formSchema.parse(formObj);
  const cents = Math.floor(value * 100);

  await db.insert(transactions).values({
    type,
    timestamp,
    userId,
    categoryId,
    walletId,
    cents,
  });

  return json({ ok: true });
}
