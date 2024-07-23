import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { IndexLoaderData } from "~/routes/app._index";

export type UpsertTransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  categories: IndexLoaderData["categories"];
  wallets: IndexLoaderData["wallets"];
  transaction?: IndexLoaderData["transactions"][number] | null;
  Trigger?: ReactNode;
};

function getRandomFetcherKey() {
  return `upsert-transaction-${uuidv4()}`;
}

export const UpsertTransactionDialog = ({
  open,
  onClose,
  categories,
  wallets,
  transaction: t,
  Trigger,
}: UpsertTransactionDialogProps) => {
  const [fetcherKey, setFetcherKey] = useState(getRandomFetcherKey);
  const fetcher = useFetcher({ key: fetcherKey });

  if (fetcher.data && open) {
    const { ok } = z
      .object({ ok: z.boolean() })
      .catch({ ok: false })
      .parse(fetcher.data);

    if (ok) {
      setFetcherKey(getRandomFetcherKey());
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) onClose();
      }}
    >
      {Trigger && <DialogTrigger asChild>{Trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t ? "Update" : "Create New"} Transaction</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={t ? t.type : "expense"}>
          <TabsList>
            <TabsTrigger value="expense" disabled={!!t}>
              Expense
            </TabsTrigger>
            <TabsTrigger value="income" disabled={!!t}>
              Income
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            <TransactionForm
              type="expense"
              fetcher={fetcher}
              transaction={t}
              categories={categories}
              wallets={wallets}
            />
          </TabsContent>
          <TabsContent value="income">
            <TransactionForm
              type="income"
              fetcher={fetcher}
              transaction={t}
              categories={categories}
              wallets={wallets}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const TransactionForm = ({
  categories,
  wallets,
  type,
  transaction,
  fetcher,
}: Omit<UpsertTransactionDialogProps, "open" | "onClose"> & {
  type: "expense" | "income";
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
    })
    .transform((obj) => ({
      id: obj.id,
      categoryId: obj.categoryId,
      walletId: obj.walletId,
      date: new Date(obj.timestamp),
      value: obj.cents === 0 ? undefined : obj.cents / 100,
    }))
    .parse(transaction ?? {});

  return (
    <fetcher.Form method="post" action={`/transaction/${t.id}`}>
      <input hidden name="type" defaultValue={type} />
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-left">
            Category
          </Label>
          <Select
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
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="wallet" className="text-left">
            Wallet
          </Label>
          <Select
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
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="timestamp" className="text-left">
            Date and Time
          </Label>
          <input
            id="timestamp"
            type="datetime-local"
            name="timestamp"
            defaultValue={getDateTimeVal(t.date)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="value" className="text-left">
            Value
          </Label>
          <Input
            step={0.01}
            type="number"
            id="value"
            name="value"
            className="col-span-3"
            defaultValue={t.value}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="default" type="submit" disabled={loading}>
          {t ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
};

function getDateTimeVal(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${date}T${hours}:${minutes}`;
}
