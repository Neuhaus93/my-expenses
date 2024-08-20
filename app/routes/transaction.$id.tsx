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
  const formSchema = z
    .object({
      id: z.coerce.number().int().or(z.literal("new")),
      category: z.coerce.number().int(),
      wallet: z.coerce.number().int(),
      cents: z.coerce
        .number()
        .gte(0)
        .transform((v) => Math.round(v * 100)),
      type: z.enum(["expense", "income"]),
      timestamp: z.coerce.date(),
      description: z.string().min(1).trim().nullable().catch(null),
    })
    .transform((obj) => ({
      ...obj,
      cents: obj.type === "expense" ? -obj.cents : obj.cents,
    }));

  const {
    id,
    type,
    category: categoryId,
    wallet: walletId,
    cents,
    timestamp,
    description,
  } = formSchema.parse({ ...formObj, id: args.params.id });

  if (id === "new") {
    await db.insert(transactions).values({
      type,
      timestamp,
      userId,
      categoryId,
      walletId,
      cents,
      description,
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
        description,
      })
      .where(eq(transactions.id, id));
  }

  return json({ ok: true });
}
