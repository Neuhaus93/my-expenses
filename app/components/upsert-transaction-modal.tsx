import {
  Button,
  Flex,
  Modal,
  NativeSelect,
  SegmentedControl,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateTimePicker, DateValue } from "@mantine/dates";
import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { CategoriesSelect } from "~/components/categories-select";
import { isValidTransactionType, TransactionType } from "~/lib/transacion";
import { IndexLoaderData } from "~/routes/app._index";

export type UpsertTransactionDialogProps = {
  opened: boolean;
  onClose: () => void;
  categories: IndexLoaderData["categories"];
  wallets: IndexLoaderData["wallets"];
  transaction: IndexLoaderData["transactions"][number] | null;
};

function getRandomFetcherKey() {
  return `upsert-transaction-${uuidv4()}`;
}

function getTransactionTab(
  transaction: UpsertTransactionDialogProps["transaction"],
) {
  if (!transaction) return "expense" as const;
  if (transaction.isTransference) return "transference" as const;
  return transaction.type;
}

export const UpsertTransactionModal = ({
  opened,
  onClose,
  categories,
  wallets,
  transaction: t,
}: UpsertTransactionDialogProps) => {
  const [tab, setTab] = useState(() => getTransactionTab(t));
  const [fetcherKey, setFetcherKey] = useState(getRandomFetcherKey);
  const fetcher = useFetcher({ key: fetcherKey });

  useEffect(() => {
    setTab(() => getTransactionTab(t));
  }, [t]);

  useEffect(() => {
    if (fetcher.data && opened) {
      const { ok } = z
        .object({ ok: z.boolean() })
        .catch({ ok: false })
        .parse(fetcher.data);

      if (ok) {
        setFetcherKey(getRandomFetcherKey());
        onClose();
      }
    }
  }, [fetcher.data, opened, onClose]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Transaction"
      centered
      size="lg"
    >
      <SegmentedControl
        data={[
          { label: "Expense", value: "expense" },
          { label: "Income", value: "income" },
          {
            label: "Transference",
            value: "transference",
            disabled: wallets.length < 2,
          },
        ]}
        disabled={!!t}
        value={tab}
        onChange={(value) => {
          if (isValidTransactionType(value)) setTab(value);
        }}
        fullWidth
      />
      <TransactionForm
        tab={tab}
        fetcher={fetcher}
        transaction={t}
        categories={categories}
        wallets={wallets}
      />
    </Modal>
  );
};

const TransactionForm = ({
  categories,
  wallets,
  transaction = null,
  tab,
  fetcher,
}: Pick<
  UpsertTransactionDialogProps,
  "categories" | "wallets" | "transaction"
> & {
  tab: TransactionType;
  fetcher: FetcherWithComponents<unknown>;
}) => {
  const loading = fetcher.state !== "idle";
  const t = (() => {
    const emptyTransaction = {
      tab,
      id: "new",
      category: { id: categories.find((c) => c.type === tab)?.id ?? -1 },
      wallet: { id: wallets[0].id },
      timestamp: Date.now(),
      cents: undefined,
      description: "",
      ...(tab === "transference" && {
        transferenceFrom: { walletId: wallets[0].id },
        transferenceTo: { walletId: wallets[1].id },
      }),
    };
    const baseSchema = z.object({
      id: z.number().or(z.literal("new")),
      category: z.object({ id: z.number().int() }).transform((obj) => obj.id),
      wallet: z.object({ id: z.number().int() }).transform((obj) => obj.id),
      timestamp: z.string().or(z.number()),
      cents: z.number().optional(),
      description: z
        .string()
        .nullable()
        .transform((str) => str ?? ""),
    });
    const finalSchema = z
      .discriminatedUnion("tab", [
        baseSchema.extend({ tab: z.enum(["expense", "income"]) }),
        baseSchema.extend({
          tab: z.literal("transference"),
          transferenceFrom: z
            .object({ walletId: z.number().int() })
            .transform((v) => v.walletId),
          transferenceTo: z
            .object({ walletId: z.number().int() })
            .transform((v) => v.walletId),
        }),
      ])
      .transform((obj) => {
        const { timestamp, cents, ...rest } = obj;
        return {
          ...rest,
          date: new Date(timestamp),
          value: typeof cents === "number" ? Math.abs(cents / 100) : undefined,
        };
      });

    return finalSchema.parse(
      transaction
        ? { ...transaction, tab: getTransactionTab(transaction) }
        : emptyTransaction,
    );
  })();
  const [date, setDate] = useState<DateValue>(t.date);

  return (
    <fetcher.Form method="post" action={`/transaction/${t.id}`}>
      <input hidden name="type" readOnly value={tab} />
      <Stack mt="md" mb="lg" gap="sm">
        {t.tab !== "transference" && (
          <CategoriesSelect
            key={`categories-select-${t.tab}`}
            label="Category"
            defaultCategoryId={t.category}
            categories={categories.filter((c) => c.type === tab)}
          />
        )}
        <NativeSelect
          name="wallet"
          defaultValue={
            t.tab === "transference" ? t.transferenceFrom : t.wallet
          }
          label={t.tab === "transference" ? "From Wallet" : "Wallet"}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
        {t.tab === "transference" && (
          <NativeSelect
            name="toWallet"
            defaultValue={t.transferenceTo}
            label="To Wallet"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <input
          id="timestamp"
          name="timestamp"
          value={getDateTimeVal(date)}
          readOnly
          hidden
        />
        <DateTimePicker
          label="Date and Time"
          value={date}
          onChange={setDate}
          valueFormat="L HH:mm"
        />
        <TextInput
          label="Value"
          step={0.01}
          type="number"
          name="cents"
          defaultValue={t.value}
          placeholder="R$ 0.00"
        />
        <Textarea
          label="Description"
          id="description"
          name="description"
          defaultValue={t.description}
        />
      </Stack>

      <Flex justify="flex-end">
        <Button type="submit" disabled={loading}>
          {t.id === "new" ? "Create" : "Update"}
        </Button>
      </Flex>
    </fetcher.Form>
  );
};

function getDateTimeVal(dateValue: Date | null) {
  const now = dateValue ?? new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${date}T${hours}:${minutes}`;
}
