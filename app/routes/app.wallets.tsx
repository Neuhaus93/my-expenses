import { getAuth } from "@clerk/remix/ssr.server";
import { Card, Grid, Stack, Text } from "@mantine/core";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq, sql } from "drizzle-orm";
import { db } from "~/db/config.server";
import { transactions, wallets as walletsTable } from "~/db/schema.server";
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

      <Grid>
        {wallets.map((wallet) => (
          <Grid.Col key={wallet.id} span={{ base: 12, md: 6, lg: 3 }}>
            <Card mb={16} shadow="xs" radius="md">
              <Stack gap="sm">
                <Text size="sm">{wallet.name}</Text>
                <Text fw={500}>{formatCurrency(wallet.balance)}</Text>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </div>
  );
}
