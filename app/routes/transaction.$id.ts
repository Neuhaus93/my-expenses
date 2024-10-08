import { ActionFunctionArgs, json } from "@remix-run/node";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { categories, transactions, transferences } from "~/db/schema.server";
import { CATEGORY_SPECIAL } from "~/lib/category";
import { auth } from "~/services/auth.server";

export async function action(args: ActionFunctionArgs) {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const baseSchema = z.object({
    id: z.coerce.number().int().or(z.literal("new")),
    wallet: z.coerce.number().int(),
    cents: z.coerce
      .number()
      .gt(0)
      .transform((v) => Math.round(v * 100)),
    timestamp: z.coerce.date(),
    description: z.string().min(1).trim().nullable().catch(null),
  });
  const formSchema = z
    .discriminatedUnion("type", [
      baseSchema.extend({
        type: z.enum(["expense", "income"]),
        category: z.coerce.number().int().positive(),
      }),
      baseSchema.extend({
        type: z.literal("transference"),
        toWallet: z.coerce.number().int(),
      }),
    ])
    .superRefine((obj, ctx) => {
      if (obj.type === "transference" && obj.wallet === obj.toWallet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot transfer to the same wallet",
        });
      }
    })
    .transform((obj) => ({
      ...obj,
      cents: obj.type === "expense" ? -obj.cents : obj.cents,
    }));

  const formValues = formSchema.parse({ ...formObj, id: args.params.id });
  const { id, wallet: walletId, cents, timestamp, description } = formValues;

  if (id === "new") {
    if (formValues.type === "transference") {
      const specialCategories = await db
        .select({
          id: categories.id,
          unique: categories.unique,
        })
        .from(categories)
        .where(
          and(eq(categories.userId, userId), isNotNull(categories.unique)),
        );
      const categoryTransactionIn = specialCategories.find(
        (c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_IN,
      )!.id;
      const categoryTransactionOut = specialCategories.find(
        (c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_OUT,
      )!.id;

      // Create in and out transactions
      const [{ id: transactionOutId }, { id: transactionInId }] = await db
        .insert(transactions)
        .values([
          {
            type: "expense",
            timestamp,
            userId,
            categoryId: categoryTransactionOut,
            walletId: walletId,
            isTransference: true,
            cents: -cents,
            description,
          },
          {
            type: "income",
            timestamp,
            userId,
            categoryId: categoryTransactionIn,
            walletId: formValues.toWallet,
            isTransference: true,
            cents,
            description,
          },
        ])
        .returning({ id: transactions.id });

      // Create transference
      await db.insert(transferences).values({
        transactionOutId,
        transactionInId,
      });
    } else {
      // Create normal transaction
      await db.insert(transactions).values({
        type: formValues.type,
        timestamp,
        userId,
        categoryId: formValues.category,
        walletId,
        cents,
        description,
      });
    }
  } else {
    if (formValues.type === "transference") {
      const foundTransference = await db.query.transferences.findFirst({
        where: or(
          eq(transferences.transactionOutId, id),
          eq(transferences.transactionInId, id),
        ),
      });

      if (!foundTransference) {
        throw new Error("Transference not found");
      }

      // Update expense transaction
      await db
        .update(transactions)
        .set({
          timestamp,
          walletId: walletId,
          cents: -cents,
          description,
        })
        .where(eq(transactions.id, foundTransference.transactionOutId));

      // Update income transaction
      await db
        .update(transactions)
        .set({
          timestamp,
          walletId: formValues.toWallet,
          cents,
          description,
        })
        .where(eq(transactions.id, foundTransference.transactionInId));
    } else {
      // update normal transaction
      await db
        .update(transactions)
        .set({
          timestamp,
          categoryId: formValues.category,
          walletId,
          cents,
          description,
        })
        .where(eq(transactions.id, id));
    }
  }

  return json({ ok: true });
}
