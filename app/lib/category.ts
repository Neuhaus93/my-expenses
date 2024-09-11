import { and, desc, eq } from "drizzle-orm";
import { db } from "~/db/config.server";
import {
  categories as categoriesTable,
  SelectCategory,
} from "~/db/schema.server";

type Category = Omit<SelectCategory, "userId">;
export type NestedCategories = Array<
  Category & {
    children: Category[];
  }
>;

// TODO: Don't make this hard-coded
export const CATEGORY_TRANSACTION = {
  IN: 49,
  OUT: 50,
};

export async function getNestedCategories(
  userId: number,
  type: "income" | "expense" | null = null,
) {
  const categories = await db
    .select({
      id: categoriesTable.id,
      title: categoriesTable.title,
      type: categoriesTable.type,
      parentId: categoriesTable.parentId,
      iconName: categoriesTable.iconName,
    })
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
