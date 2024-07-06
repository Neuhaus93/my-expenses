import { useFetcher } from "@remix-run/react";
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
import { useEffect, useState } from "react";
import { z } from "zod";

export const CreateExpenseDialog = ({
  categories,
  wallets,
}: {
  categories: Array<{ title: string; id: number }>;
  wallets: Array<{ id: number; name: string }>;
}) => {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    const { ok } = z
      .object({ ok: z.boolean() })
      .catch({ ok: false })
      .parse(fetcher.data);

    if (ok) {
      setOpen(false);
    }
  }, [fetcher.data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Expense</DialogTitle>
        </DialogHeader>

        <fetcher.Form method="post" action="/transaction/new">
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
                {categories.map((c) => (
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
              Create Expense
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
};
