import {
  ActionIcon,
  Box,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { IconTrash } from "@tabler/icons-react";
import { eq, sql } from "drizzle-orm";
import { useEffect, FormEvent } from "react";
import { z } from "zod";
import { CreateWalletModal } from "~/components/create-wallet-modal";
import { db } from "~/db/config.server";
import { wallets as tableWallets, transactions } from "~/db/schema.server";
import { formatCurrency } from "~/lib/currency";
import { auth } from "~/services/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

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
export type WalletsLoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function WalletsPage() {
  const { wallets } = useLoaderData<typeof loader>();

  return (
    <Container>
      <Title order={2} mb="lg" ta="center">
        Wallets
      </Title>

      <Group mt="lg">
        <CreateWalletModal />
      </Group>

      <Grid mt="lg">
        {wallets.map((wallet) => (
          <WalletItem key={wallet.id} wallet={wallet} />
        ))}
      </Grid>
    </Container>
  );
}

const WalletItem = ({
  wallet,
}: {
  wallet: WalletsLoaderData["wallets"][number];
}) => {
  return (
    <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
      <Card withBorder shadow="sm" radius="md" style={{ width: "100%" }}>
        <Group>
          <Stack flex={1} gap="sm">
            <Text size="sm">{wallet.name}</Text>
            <Text fw={500}>{formatCurrency(wallet.balance)}</Text>
          </Stack>
          <DeleteButton id={wallet.id} />
        </Group>
      </Card>
    </Grid.Col>
  );
};

const DeleteButton = ({ id }: { id: number }) => {
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    if (!fetcher.data) return;

    const data = z
      .discriminatedUnion("ok", [
        z.object({ ok: z.literal(false), message: z.string() }),
        z.object({ ok: z.literal(true) }),
      ])
      .catch({ ok: false, message: "Something went wrong, please try again" })
      .parse(fetcher.data);

    notifications.show({
      title: data.ok ? "Wallet deleted" : "Error deleting the wallet",
      message: data.ok ? undefined : data.message,
      position: "top-right",
      color: data.ok ? "green" : "red",
    });
  }, [fetcher.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirm("Are you sure you want to delete this wallet?")) {
      fetcher.submit(event.currentTarget, {
        action: `/wallet/${id}/delete`,
        method: "POST",
      });
    }
  };

  return (
    <Box mr="xs">
      <fetcher.Form method="post" onSubmit={handleSubmit}>
        <input hidden name="id" defaultValue={id} />
        <ActionIcon
          variant="subtle"
          size="lg"
          radius="xl"
          color="dark"
          disabled={loading}
          type="submit"
        >
          <IconTrash size="1.4rem" />
        </ActionIcon>
      </fetcher.Form>
    </Box>
  );
};
