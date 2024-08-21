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
import { Fragment, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
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
  if (transaction.transference) return "transference" as const;
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
        type={tab}
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
  type,
  transaction = null,
  fetcher,
}: Pick<
  UpsertTransactionDialogProps,
  "categories" | "wallets" | "transaction"
> & {
  type: TransactionType;
  fetcher: FetcherWithComponents<unknown>;
}) => {
  const loading = fetcher.state !== "idle";
  const t = (() => {
    const emptyTransaction = {
      type,
      id: "new",
      categoryId: categories[0].id,
      walletId: wallets[0].id,
      toWalletId: wallets[1]?.id,
      date: new Date(),
      value: 0,
      description: "",
    };
    const baseSchema = z.object({
      id: z.number().or(z.literal("new")),
      categoryId: z.number().int(),
      walletId: z.number().int(),
      date: z.date(),
      value: z.number().optional(),
      description: z.string(),
    });
    const finalSchema = z.discriminatedUnion("type", [
      baseSchema.extend({ type: z.enum(["expense", "income"]) }),
      baseSchema.extend({
        type: z.literal("transference"),
        toWalletId: z.number().int(),
      }),
    ]);

    return finalSchema.parse(transaction ?? emptyTransaction);
  })();
  const [date, setDate] = useState<DateValue>(t.date);

  return (
    <fetcher.Form method="post" action={`/transaction/${t.id}`}>
      <input hidden name="type" readOnly value={type} />
      <Stack mt="md" mb="lg" gap="sm">
        {type !== "transference" && (
          <NativeSelect
            label="Category"
            name="category"
            defaultValue={t.categoryId}
          >
            {categories
              .filter((c) => c.type === type)
              .map((c, index) => (
                <Fragment key={index}>
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                  {c.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {`•\u00A0\u00A0${child.title}`}
                    </option>
                  ))}
                </Fragment>
              ))}
          </NativeSelect>
        )}
        <NativeSelect
          name="wallet"
          defaultValue={t.walletId}
          label={t.type === "transference" ? "From Wallet" : "Wallet"}
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
        {t.type === "transference" && (
          <NativeSelect
            name="to-wallet"
            defaultValue={t.toWalletId}
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
