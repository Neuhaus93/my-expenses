import {
  Button,
  Modal,
  NativeSelect,
  SegmentedControl,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateTimePicker, DateValue } from "@mantine/dates";
import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { DialogFooter } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
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
  const [tab, setTab] = useState(t ? t.type : "expense");
  const [fetcherKey, setFetcherKey] = useState(getRandomFetcherKey);
  const fetcher = useFetcher({ key: fetcherKey });

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
    >
      <SegmentedControl
        data={["expense", "income"]}
        disabled={!!t}
        value={tab}
        onChange={(value) =>
          setTab(z.enum(["expense", "income"]).catch("expense").parse(value))
        }
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
      categoryId: z.number().catch(categories[0].id),
      walletId: z.number().catch(wallets[0].id),
      timestamp: z.string().catch(Date().toString()),
      cents: z.number().catch(0),
      description: z.string().catch(""),
    })
    .transform((obj) => ({
      id: obj.id,
      categoryId: obj.categoryId,
      walletId: obj.walletId,
      date: new Date(obj.timestamp),
      value: obj.cents === 0 ? undefined : obj.cents / 100,
      description: obj.description,
    }))
    .parse(transaction ?? {});
  const [date, setDate] = useState<DateValue>(t.date);

  return (
    <fetcher.Form method="post" action={`/transaction/${t.id}`}>
      <input hidden name="type" defaultValue={type} />
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-left">
            Category
          </Label>
          <NativeSelect
            name="category"
            defaultValue={t.categoryId}
            className="col-span-3"
          >
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="wallet" className="text-left">
            Wallet
          </Label>
          <NativeSelect
            id="wallet"
            name="wallet"
            defaultValue={t.walletId}
            className="col-span-3"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <input
            id="timestamp"
            name="timestamp"
            value={getDateTimeVal(date)}
            readOnly
            hidden
          />
          <Label htmlFor="timestamp" className="text-left">
            Date and Time
          </Label>
          <DateTimePicker
            value={date}
            onChange={setDate}
            className="col-span-3"
            valueFormat="L HH:mm"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="value" className="text-left">
            Value
          </Label>
          <TextInput
            step={0.01}
            type="number"
            id="value"
            name="value"
            className="col-span-3"
            defaultValue={t.value}
            placeholder="R$ 0.00"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-left">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            className="col-span-3"
            defaultValue={t.description}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {t.id === "new" ? "Create" : "Update"}
        </Button>
      </DialogFooter>
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
