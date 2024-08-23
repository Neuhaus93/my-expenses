import { CATEGORY_ICON_LIST } from "../lib/categories";
import { getAuth } from "@clerk/remix/ssr.server";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { z } from "zod";
import { db } from "~/db/config.server";
import { categories } from "~/db/schema.server";

export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }
  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  const formSchema = z.object({
    type: z.enum(["income", "expense"]),
    title: z.string(),
    iconName: z.enum(CATEGORY_ICON_LIST),
    isParent: z
      .literal("on")
      .optional()
      .transform((value) => !!value),
    parent: z.coerce.number().int(),
  });

  const {
    type,
    title,
    isParent,
    iconName,
    parent: parentId,
  } = formSchema.parse(formObj);

  if (!isParent) {
    const parent = await db.query.categories.findFirst({
      where(fields, { and, eq, isNull }) {
        return and(
          eq(fields.userId, userId),
          eq(fields.id, parentId),
          isNull(fields.parentId),
        );
      },
    });

    if (!parent) {
      return json(
        { ok: false, error: "Parent category not found" },
        { status: 400 },
      );
    }
  }

  await db.insert(categories).values({
    title,
    userId,
    iconName,
    type,
    parentId: isParent ? null : parentId,
  });

  return json({ ok: true });
}
