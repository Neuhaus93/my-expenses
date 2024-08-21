import { ActionFunctionArgs, json } from "@remix-run/node";
import { eq, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { transactions, transferences } from "~/db/schema.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    id: z.coerce.number().int(),
  });
  const { id } = formSchema.parse(formObj);
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id));
  if (transaction.isTransference) {
    const [transference] = await db
      .select()
      .from(transferences)
      .where(
        or(
          eq(transferences.transactionOutId, id),
          eq(transferences.transactionInId, id),
        ),
      );

    await db.delete(transferences).where(eq(transferences.id, transference.id));
    await db
      .delete(transactions)
      .where(
        inArray(transactions.id, [
          transference.transactionOutId,
          transference.transactionInId,
        ]),
      );
  } else {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  return json({ ok: true });
}
