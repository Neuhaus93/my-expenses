import { getAuth } from "@clerk/remix/ssr.server";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { Trash2, Pencil } from "lucide-react";
import { useRef } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
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
            eq(transactions.categoryId, category)
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
    .parse(balanceResult);

  return json(
    { transactions, categories, wallets, defaultCategory: category, balance },
    200
  );
}

export type IndexLoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Index() {
  const { transactions, categories, wallets, defaultCategory, balance } =
    useLoaderData<typeof loader>();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="px-4 py-6">
      <div className="flex mb-4">
        <div className="shadow-md rounded-lg p-3 min-w-[200px] bg-white">
          <p className="text-sm text-slate-500">Current Balance</p>
          <p className="mt-1.5">{formatCurrency(balance)}</p>
        </div>
      </div>

      <Form
        ref={formRef}
        method="post"
        className="flex items-end space-x-2 mb-8"
      >
        <div className="w-[180px]">
          <label
            htmlFor="category"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Select an option
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaultCategory}
            onChange={() => {
              if (formRef.current) {
                formRef.current.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true })
                );
              }
            }}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          >
            <option value="-1">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="sr-only">
          Filter
        </button>
      </Form>

      <UpsertTransactionDialog
        categories={categories}
        wallets={wallets}
        Trigger={<Button>Create Transaction</Button>}
      />

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg mt-2">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              {TABLE_COLS.map((col) => (
                <th key={col} scope="col" className="px-6 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {transactions.map((t) => (
              <tr
                key={t.id}
                className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
              >
                <th
                  scope="row"
                  className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                >
                  {t.category.title}
                </th>
                <td className="px-6 py-4">{t.wallet.name}</td>
                <td className="px-6 py-4">{t.description}</td>
                <td
                  className={`px-6 py-4 ${
                    t.type === "income" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(t.cents)}
                </td>
                <td className="px-6 py-4">
                  {format(t.timestamp, "dd MMM, yyyy")}
                </td>
                <td className="px-6 py-4 flex gap-1">
                  <DeleteButton id={t.id} />

                  <UpsertTransactionDialog
                    categories={categories}
                    wallets={wallets}
                    transaction={t}
                    Trigger={
                      <Button size="sm" variant="default">
                        <Pencil size={16} />
                      </Button>
                    }
                  />
                </td>
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

  return (
    <fetcher.Form method="post" action={`/transaction/${id}/delete`}>
      <input hidden name="id" defaultValue={id} />
      <Button size="sm" variant="destructive" disabled={loading}>
        <Trash2 size={16} />
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

const TABLE_COLS = [
  "Category",
  "Wallet",
  "Description",
  "Value",
  "Date",
  "Actions",
];
