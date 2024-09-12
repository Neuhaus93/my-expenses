import { ActionFunctionArgs, json } from "@remix-run/node";
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
  const formSchema = z.object({
    name: z.string().min(1).max(255),
  });
  const { name } = formSchema.parse(formObj);

  await db.insert(wallets).values({
    userId,
    name,
    initialBalance: 0,
  });

  return json({ ok: true });
};
