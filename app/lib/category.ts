import { desc, eq } from "drizzle-orm";
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

export async function getNestedCategories(userId: string) {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
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
