import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { sql, eq } from "drizzle-orm";
import { db } from "~/db/config.server";
import { wallets as walletsTable, transactions } from "~/db/schema.server";
import { formatCurrency } from "~/lib/currency";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const wallets = await db
    .select({
      id: walletsTable.id,
      name: walletsTable.name,
      balance: sql<number>`sum(
        case
          WHEN type = 'income' THEN cents
          WHEN type = 'expense' THEN -cents
          ELSE 0
        end
      )`,
    })
    .from(transactions)
    .rightJoin(walletsTable, eq(transactions.walletId, walletsTable.id))
    .where(eq(walletsTable.userId, userId))
    .orderBy(walletsTable.name)
    .groupBy(transactions.userId, walletsTable.id);

  return { wallets };
}

export default function WalletsPage() {
  const { wallets } = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 my-6">
      <h1 className="text-lg font-semibold">Wallets Page</h1>

      <div className="mt-3 grid grid-cols-2 gap-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="min-w-[200px] rounded-lg bg-white p-3 shadow-md"
          >
            <p className="text-sm text-slate-500">{wallet.name}</p>
            <p className="mt-1.5">{formatCurrency(wallet.balance)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
