import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { transactions } from "~/db/schema.server";

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    id: z.coerce.number().int().or(z.literal("new")),
    category: z.coerce.number().int(),
    wallet: z.coerce.number().int(),
    value: z.coerce.number(),
    type: z.enum(["expense", "income"]),
    timestamp: z.coerce.date(),
  });

  const {
    id,
    type,
    category: categoryId,
    wallet: walletId,
    value,
    timestamp,
  } = formSchema.parse({ ...formObj, id: args.params.id });
  const cents = Math.floor(value * 100);

  if (id === "new") {
    await db.insert(transactions).values({
      type,
      timestamp,
      userId,
      categoryId,
      walletId,
      cents,
    });
  } else {
    await db
      .update(transactions)
      .set({
        type,
        timestamp,
        userId,
        categoryId,
        walletId,
        cents,
      })
      .where(eq(transactions.id, id));
  }

  return json({ ok: true });
}
