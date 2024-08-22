import { getAuth } from "@clerk/remix/ssr.server";
import { Card, Grid, Stack, Text, Title } from "@mantine/core";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq, sql } from "drizzle-orm";
import { db } from "~/db/config.server";
import { transactions, wallets as tableWallets } from "~/db/schema.server";
import { formatCurrency } from "~/lib/currency";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const wallets = await db
    .select({
      id: tableWallets.id,
      name: tableWallets.name,
      initialBalance: tableWallets.initialBalance,
      balance: sql<number>`cast((sum(${transactions.cents}) + ${tableWallets.initialBalance}) as int)`,
    })
    .from(transactions)
    .rightJoin(tableWallets, eq(transactions.walletId, tableWallets.id))
    .where(eq(tableWallets.userId, userId))
    .orderBy(tableWallets.name)
    .groupBy(transactions.userId, tableWallets.id);

  return { wallets };
}

export default function WalletsPage() {
  const { wallets } = useLoaderData<typeof loader>();

  return (
    <div>
      <Title order={2} mb="lg">
        Wallets
      </Title>

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
