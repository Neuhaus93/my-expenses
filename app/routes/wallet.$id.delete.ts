import { ActionFunctionArgs, json } from "@remix-run/node";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { transactions, wallets } from "~/db/schema.server";
import { auth } from "~/services/auth.server";

export const action = async (args: ActionFunctionArgs) => {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    id: z.coerce.number().int(),
  });
  const { id } = formSchema.parse(formObj);

  // Get the wallet to be deleted. Make sure to check if the `userId` matches
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)));

  if (!wallet) {
    return json({ ok: false, message: "Category not found" }, { status: 400 });
  }

  // Should not be able to delete a wallet with transactions
  const [walletTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.walletId, id))
    .limit(1);
  if (walletTransaction) {
    return json(
      {
        ok: false,
        message: "Wallet has one or more transactions, cannot be deleted",
      },
      { status: 400 },
    );
  }

  await db.delete(wallets).where(eq(wallets.id, id));
  return json({ ok: true });
};
