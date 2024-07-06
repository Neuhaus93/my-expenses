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
    title: z.string(),
  });

  const { title } = formSchema.parse(formObj);
  await db.insert(categories).values({
    title,
    userId,
  });

  return json({ ok: true });
}
