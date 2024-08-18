import { and, desc, eq } from "drizzle-orm";
import { db } from "~/db/config.server";
import {
  categories as categoriesTable,
  SelectCategory,
} from "~/db/schema.server";

export type NestedCategories = Array<
  SelectCategory & {
    children: SelectCategory[];
  }
>;

export async function getNestedCategories(
  userId: string,
  type: "income" | "expense" | null = null,
) {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.userId, userId),
        type ? eq(categoriesTable.type, type) : undefined,
      ),
    )
    .orderBy(desc(categoriesTable.parentId), categoriesTable.title);

  const nestedCategories = categories.reduce<NestedCategories>(
    (acc, category) => {
      if (category.parentId === null) {
        acc.push({ ...category, children: [] });
      } else {
        const parent = acc.find((c) => c.id === category.parentId);
        if (parent) {
          parent.children.push(category);
        }
      }
      return acc;
    },
    [],
  );

  return nestedCategories;
}
