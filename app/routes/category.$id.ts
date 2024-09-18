import { CATEGORY_ICON_LIST } from "../lib/categories";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { categories, transactions } from "~/db/schema.server";
import { auth } from "~/services/auth.server";

export async function action(args: ActionFunctionArgs) {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z
    .object({
      "category.id": z.coerce.number().int().or(z.literal("new")),
      "category.type": z.enum(["income", "expense"]),
      "category.title": z.string().min(1).max(255),
      "category.iconName": z.enum(CATEGORY_ICON_LIST),
    })
    .passthrough()
    .transform((values) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childrenObj: Record<string, any> = {};

      for (const [key, value] of Object.entries(values)) {
        if (key.startsWith("category.")) continue;
        const firstDotIndex = key.indexOf(".");
        const secondDotIndex = key.indexOf(".", firstDotIndex + 1);
        const number = key.substring(firstDotIndex + 1, secondDotIndex);
        childrenObj[number] = {
          ...(childrenObj[number] ? childrenObj[number] : {}),
          [key.substring(secondDotIndex + 1)]: value,
        };
      }

      return {
        id: values["category.id"],
        type: values["category.type"],
        title: values["category.title"],
        iconName: values["category.iconName"],
        children: Object.values(childrenObj),
      };
    })
    .pipe(
      z.object({
        id: z.coerce.number().int().or(z.literal("new")),
        type: z.enum(["income", "expense"]),
        title: z.string().min(1).max(255),
        iconName: z.enum(CATEGORY_ICON_LIST),
        children: z.array(
          z.object({
            id: z.coerce.number().int().or(z.literal("new")),
            title: z.string().min(1).max(255),
            iconName: z.enum(CATEGORY_ICON_LIST),
          }),
        ),
      }),
    );
  const { id, title, type, iconName, children } = formSchema.parse(formObj);

  if (id === "new") {
    // Create parent category
    const [parent] = await db
      .insert(categories)
      .values({
        title,
        userId,
        iconName,
        type,
        parentId: null,
      })
      .returning({ id: categories.id });

    // Create all subcategories
    await db.insert(categories).values(
      children.map((c) => ({
        title: c.title,
        userId,
        iconName: c.iconName,
        type,
        parentId: parent.id,
      })),
    );
  } else {
    const results = await db
      .select()
      .from(categories)
      .where(or(eq(categories.id, id), eq(categories.parentId, id)));

    if (results.findIndex((res) => res.userId !== userId) !== -1) {
      return json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const idsToDelete: number[] = [];
    // Update or delete existing categories
    for (const res of results) {
      if (res.id === id) {
        // Update parent category
        await db
          .update(categories)
          .set({ title, iconName })
          .where(eq(categories.id, id));
      } else {
        const child = children.find((c) => c.id === res.id);

        if (child) {
          // Update a category
          await db
            .update(categories)
            .set({
              title: child.title,
              iconName: child.iconName,
            })
            .where(eq(categories.id, res.id));
        } else {
          // Delete the category
          idsToDelete.push(res.id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      // Make sure we are not deleting a subcategory with one or more transactions
      const [transaction] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(inArray(transactions.categoryId, idsToDelete))
        .limit(1);
      if (transaction) {
        return json(
          {
            ok: false,
            message: `One of the deleted subcategories has one or more transactions, error updating`,
          },
          { status: 400 },
        );
      } else {
        // Delete the subcategories
        await db.delete(categories).where(inArray(categories.id, idsToDelete));
      }
    }

    // Create new subcategories
    for (const c of children) {
      if (c.id === "new") {
        await db.insert(categories).values({
          title: c.title,
          iconName: c.iconName,
          userId,
          type,
          parentId: id,
        });
      }
    }
  }

  return json({ ok: true });
}
