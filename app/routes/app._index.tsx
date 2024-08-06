import { getAuth } from "@clerk/remix/ssr.server";
import { ActionIcon, Button, NativeSelect, Table } from "@mantine/core";
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
    orderBy(fields, operators) {
      return [operators.asc(fields.title)];
    },
  });
  const walletsPromise = db.query.wallets.findMany({
    where(fields, { eq }) {
      return eq(fields.userId, userId);
    },
    orderBy(fields, operators) {
      return [operators.asc(fields.name)];
    },
  });
  const balanceResultPromise = db
    .select({
      balance: sql<number>`sum(
        case
          when type = 'income' THEN cents
          WHEN type = 'transference' THEN cents
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
    cell: (info) => format(info.getValue(), "PPP HH:mm"),
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
        <div className="flex gap-2">
          <ActionIcon
            variant="outline"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => (meta as any)?.onClickEdit(original)}
          >
            <Pencil size={16} />
          </ActionIcon>
          <DeleteButton id={original.id} />
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
        className="mb-8 flex items-end space-x-2 w-[180x]"
      >
        <NativeSelect
          label="Select a category"
          name="category"
          defaultValue={defaultCategory}
          onChange={() => {
            if (formRef.current) {
              formRef.current.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true }),
              );
            }
          }}
        >
          <option value="-1">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </NativeSelect>

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
        <Table striped>
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id} scope="col">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>

          <Table.Tbody>
            {table.getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
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
      <ActionIcon variant="subtle" color="red" disabled={loading}>
        <Trash2 size={16} />
      </ActionIcon>
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
