import { FetcherWithComponents, useFetcher } from "@remix-run/react";
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
import { useState } from "react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export const CreateTransactionDialog = ({
  categories,
  wallets,
}: {
  categories: Array<{ title: string; id: number; type: "expense" | "income" }>;
  wallets: Array<{ id: number; name: string }>;
}) => {
  const [open, setOpen] = useState(false);
  const [fetcherKey, setFetcherKey] = useState(0);
  const fetcher = useFetcher({ key: `create-transaction-${fetcherKey}` });

  if (fetcher.data && open) {
    const { ok } = z
      .object({ ok: z.boolean() })
      .catch({ ok: false })
      .parse(fetcher.data);

    if (ok) {
      setFetcherKey(fetcherKey + 1);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Transaction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="expense">
          <TabsList>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            <TransactionForm
              type="expense"
              fetcher={fetcher}
              categories={categories}
              wallets={wallets}
            />
          </TabsContent>
          <TabsContent value="income">
            <TransactionForm
              type="income"
              fetcher={fetcher}
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
  fetcher,
}: {
  categories: Array<{ title: string; id: number; type: "expense" | "income" }>;
  wallets: Array<{ id: number; name: string }>;
  type: "expense" | "income";
  fetcher: FetcherWithComponents<unknown>;
}) => {
  const loading = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" action="/transaction/new">
      <input hidden name="type" defaultValue={type} />
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Category
          </Label>
          <select
            id="category"
            name="category"
            defaultValue={categories[0].id}
            className="col-span-3"
          >
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="wallet" className="text-right">
            Wallet
          </Label>
          <select
            id="wallet"
            name="wallet"
            defaultValue={wallets[0].id}
            className="col-span-3"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="timestamp" className="text-right">
            Date and Time
          </Label>
          <input
            id="timestamp"
            type="datetime-local"
            name="timestamp"
            defaultValue={getDefaultDateTimeVal()}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="value" className="text-right">
            Value
          </Label>
          <Input
            step={0.01}
            type="number"
            id="value"
            name="value"
            className="col-span-3"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="default" type="submit" disabled={loading}>
          Create
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
};

function getDefaultDateTimeVal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${date}T${hours}:${minutes}`;
}
