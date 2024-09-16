import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "~/db/config.server";
import {
  categories as categoriesTable,
  SelectCategory,
} from "~/db/schema.server";

type Category = Omit<SelectCategory, "userId" | "unique">;
export type NestedCategories = Array<
  Category & {
    children: Category[];
  }
>;

export const CATEGORY_SPECIAL = {
  TRANSFERENCE_IN: "transference_in",
  TRANSFERENCE_OUT: "transference_out",
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
        isNull(categoriesTable.unique),
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
