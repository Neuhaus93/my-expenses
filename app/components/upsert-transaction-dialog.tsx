import { FetcherWithComponents, useFetcher } from "@remix-run/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Select } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  const [date, setDate] = useState<Date | undefined>(t.date);

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
            name="timestamp"
            value={getDateTimeVal(date)}
            hidden
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                className="col-span-3 font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP HH:mm") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>

            <PopoverContent>
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
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
          {t.id === "new" ? "Create" : "Update"}
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
};

function getDateTimeVal(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${date}T${hours}:${minutes}`;
}
