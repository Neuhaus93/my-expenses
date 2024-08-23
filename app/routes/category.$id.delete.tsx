import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { and, inArray, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "~/db/config.server";
import { categories, transactions } from "~/db/schema.server";

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    id: z.coerce.number().int(),
  });
  const { id } = formSchema.parse(formObj);

  const childCategories = alias(categories, "childCategories");
  const [category] = await db
    .select({
      id: categories.id,
      childCategoryIds: sql<
        Array<number | null>
      >`array_agg(${childCategories.id})`,
    })
    .from(categories)
    .leftJoin(childCategories, eq(childCategories.parentId, categories.id))
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .groupBy(categories.id);
  if (!category) {
    return json({ ok: false, message: "Category not found" }, { status: 400 });
  }

  const childCategoryIds = category.childCategoryIds.filter((i) => i !== null);
  // Should not be able to delete a category with transactions
  const [categoryTransaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        or(
          eq(transactions.categoryId, id),
          childCategoryIds.length === 0
            ? undefined
            : inArray(transactions.categoryId, childCategoryIds),
        ),
        eq(transactions.userId, userId),
      ),
    )
    .limit(1);
  if (categoryTransaction) {
    return json(
      { ok: false, message: "Category has transactions, cannot be deleted" },
      { status: 400 },
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
  return json({ ok: true });
}
