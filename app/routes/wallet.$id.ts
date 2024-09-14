import { ActionFunctionArgs, json } from "@remix-run/node";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db/config.server";
import { wallets } from "~/db/schema.server";
import { auth } from "~/services/auth.server";

export const action = async (args: ActionFunctionArgs) => {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

  const formData = await args.request.formData();
  const formObj = Object.fromEntries(formData.entries());
  console.log(formObj);
  const formSchema = z.object({
    id: z.coerce.number().int().or(z.literal("new")),
    name: z.string().min(1).max(255),
  });
  const { id, name } = formSchema.parse(formObj);

  if (id === "new") {
    await db.insert(wallets).values({
      userId,
      name,
      initialBalance: 0,
    });
  } else {
    await db.update(wallets).set({ name }).where(eq(wallets.id, id));
  }

  return json({ ok: true });
};
