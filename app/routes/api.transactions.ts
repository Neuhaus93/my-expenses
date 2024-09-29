import { ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { getTransactions } from "~/data/transactions";
import { auth } from "~/services/auth.server";

export async function action(args: ActionFunctionArgs) {
  const user = await auth.isAuthenticated(args.request);
  if (!user) {
    return json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const { id: userId } = user;

  let body: unknown = {};
  try {
    body = await args.request.json();
  } catch {
    return json(
      { ok: false, message: "Invalid request body" },
      { status: 404 },
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const { wallet, category, month, year } = z
    .object({
      category: z.coerce.number().int().catch(-1),
      wallet: z.coerce.number().int().catch(-1),
      month: z.coerce.number().int().gte(0).lte(11).catch(currentMonth),
      year: z.coerce.number().int().gte(1900).catch(currentYear),
    })
    .parse(body);
  const transactions = await getTransactions({
    userId,
    month,
    year,
    wallet,
    category,
  });

  return json(transactions);
}
