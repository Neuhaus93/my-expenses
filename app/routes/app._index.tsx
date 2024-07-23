import { getAuth } from "@clerk/remix/ssr.server";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { Pencil, Trash2 } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/my-select";
import { UpsertTransactionDialog } from "~/components/upsert-transaction-dialog";
import { db } from "~/db/config.server";
import { transactions as transactionsSchema } from "~/db/schema.server";
import { formatCurrency } from "~/lib/currency";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const url = new URL(args.request.url);
  const searchParamsObj = Object.fromEntries(url.searchParams);
  const { category } = z
    .object({ category: z.coerce.number().int().catch(-1) })
    .parse(searchParamsObj);

  const transactionsPromise = db.query.transactions.findMany({
    where: (transactions, { and, eq }) => {
      return category === -1
        ? undefined
        : and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, category),
          );
    },
    with: { category: true, wallet: true },
    orderBy(fields, { desc }) {
      return [desc(fields.timestamp)];
    },
  });
  const categoriesPromise = db.query.categories.findMany({
    where(fields, { eq }) {
      return eq(fields.userId, userId);
    },
  });
  const walletsPromise = db.query.wallets.findMany({
    where(fields, { eq }) {
      return eq(fields.userId, userId);
    },
  });
  const balanceResultPromise = db
    .select({
      balance: sql<number>`sum(
        case
          when type = 'income' THEN cents
          WHEN type = 'expense' THEN -cents
        end
      )`,
    })
    .from(transactionsSchema)
    .groupBy(transactionsSchema.userId)
    .where(eq(transactionsSchema.userId, userId));

  const [transactions, categories, wallets, balanceResult] = await Promise.all([
    transactionsPromise,
    categoriesPromise,
    walletsPromise,
    balanceResultPromise,
  ]);
  const [{ balance }] = z
    .array(z.object({ balance: z.coerce.number().int() }))
    .length(1)
    .catch([{ balance: 0 }])
    .parse(balanceResult);

  return json(
    { transactions, categories, wallets, defaultCategory: category, balance },
    200,
  );
}
export type IndexLoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

const columnHelper =
  createColumnHelper<IndexLoaderData["transactions"][number]>();

const columns = [
  columnHelper.accessor("timestamp", {
    header: "Date",
    cell: (info) => format(info.getValue(), "dd MMM, yyyy"),
  }),
  columnHelper.accessor("description", {
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("category.title", {
    header: "Category",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("wallet.name", {
    header: "Wallet",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("cents", {
    header: "Value",
    cell: ({ getValue, row }) => (
      <div
        className={
          row.original.type === "income" ? "text-green-600" : "text-red-600"
        }
      >
        {formatCurrency(getValue())}
      </div>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({
      row: { original },
      table: {
        options: { meta },
      },
    }) => {
      return (
        <div className="flex gap-1">
          <DeleteButton id={original.id} />

          <Button
            size="sm"
            variant="ghost"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => (meta as any)?.onClickEdit(original)}
          >
            <Pencil size={16} />
          </Button>
        </div>
      );
    },
  }),
];

export default function Index() {
  const { transactions, categories, wallets, defaultCategory, balance } =
    useLoaderData<typeof loader>();
  const [open, setOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<
    (typeof transactions)[number] | null
  >(null);
  const formRef = useRef<HTMLFormElement>(null);

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      onClickEdit: (transaction: (typeof transactions)[number]) => {
        setEditTransaction(transaction);
      },
    },
  });

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex">
        <div className="min-w-[200px] rounded-lg bg-white p-3 shadow-md">
          <p className="text-sm text-slate-500">Current Balance</p>
          <p className="mt-1.5">{formatCurrency(balance)}</p>
        </div>
      </div>

      <Form
        ref={formRef}
        method="post"
        className="mb-8 flex items-end space-x-2"
      >
        <div className="w-[180px]">
          <label
            htmlFor="category"
            className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Select an option
          </label>
          <Select
            id="category"
            name="category"
            defaultValue={defaultCategory}
            onChange={() => {
              if (formRef.current) {
                formRef.current.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true }),
                );
              }
            }}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          >
            <option value="-1">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </Select>
        </div>

        <button type="submit" className="sr-only">
          Filter
        </button>
      </Form>

      <UpsertTransactionDialog
        open={!!editTransaction || open}
        onClose={() => {
          setOpen(false);
          setEditTransaction(null);
        }}
        categories={categories}
        wallets={wallets}
        transaction={editTransaction}
        Trigger={
          <Button onClick={() => setOpen(true)}>Create Transaction</Button>
        }
      />

      <div className="relative mt-2 overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 rtl:text-right">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col" className="px-6 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b odd:bg-white even:bg-gray-50 dark:border-gray-700 odd:dark:bg-gray-900 even:dark:bg-gray-800"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DeleteButton = ({ id }: { id: number }) => {
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirm("Are you sure you want to delete this transaction?")) {
      fetcher.submit(event.currentTarget, {
        action: `/transaction/${id}/delete`,
        method: "POST",
      });
    }
  };

  return (
    <fetcher.Form method="post" onSubmit={handleSubmit}>
      <input hidden name="id" defaultValue={id} />
      <Button size="sm" variant="ghost" disabled={loading}>
        <Trash2 size={16} className="text-red-500" />
      </Button>
    </fetcher.Form>
  );
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const { category } = z
    .object({ category: z.coerce.number().int().catch(-1) })
    .parse(formObj);

  return redirect(category === -1 ? "/app" : `/app?category=${category}`);
}
