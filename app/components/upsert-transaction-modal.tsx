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
import { IndexLoaderData } from "~/routes/app._index";

export type UpsertTransactionDialogProps = {
  opened: boolean;
  onClose: () => void;
  categories: IndexLoaderData["categories"];
  wallets: IndexLoaderData["wallets"];
  transaction?: IndexLoaderData["transactions"][number] | null;
};

function getRandomFetcherKey() {
  return `upsert-transaction-${uuidv4()}`;
}

export const UpsertTransactionModal = ({
  opened,
  onClose,
  categories,
  wallets,
  transaction: t,
}: UpsertTransactionDialogProps) => {
  const [tab, setTab] = useState<"income" | "expense" | "transference">(
    "expense",
  );
  const [fetcherKey, setFetcherKey] = useState(getRandomFetcherKey);
  const fetcher = useFetcher({ key: fetcherKey });

  useEffect(() => {
    setTab(t ? t.type : "expense");
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
        data={["expense", "income"]}
        disabled={!!t}
        value={tab}
        onChange={(value) => {
          setTab(z.enum(["expense", "income"]).catch("expense").parse(value));
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
  transaction,
  fetcher,
}: Omit<UpsertTransactionDialogProps, "opened" | "onClose"> & {
  type: "expense" | "income" | "transference";
  fetcher: FetcherWithComponents<unknown>;
}) => {
  const loading = fetcher.state !== "idle";
  const t = z
    .object({
      id: z.number().or(z.literal("new")).catch("new"),
      category: z.object({ id: z.number() }).catch({ id: categories[0].id }),
      wallet: z.object({ id: z.number() }).catch({ id: wallets[0].id }),
      timestamp: z.string().catch(Date().toString()),
      cents: z.number().catch(0),
      description: z.string().catch(""),
    })
    .transform((obj) => ({
      id: obj.id,
      categoryId: obj.category.id,
      walletId: obj.wallet.id,
      date: new Date(obj.timestamp),
      value: obj.cents === 0 ? undefined : obj.cents / 100,
      description: obj.description,
    }))
    .parse(transaction ?? {});
  const [date, setDate] = useState<DateValue>(t.date);

  return (
    <fetcher.Form method="post" action={`/transaction/${t.id}`}>
      <input hidden name="type" readOnly value={type} />
      <Stack mt="md" mb="lg" gap="sm">
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
        <NativeSelect
          id="wallet"
          name="wallet"
          defaultValue={t.walletId}
          label="Wallet"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
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
          id="value"
          name="value"
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
