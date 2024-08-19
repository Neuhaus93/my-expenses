import { getAuth } from "@clerk/remix/ssr.server";
import { DonutChart, DonutChartCell } from "@mantine/charts";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  NativeSelect,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { eq, and, sql, gte, lt, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { FormEvent, Fragment, useRef, useState } from "react";
import { z } from "zod";
import { SavingsIllustration } from "~/components/illustrations/savings";
import { UpsertTransactionModal } from "~/components/upsert-transaction-modal";
import { db } from "~/db/config.server";
import {
  transactions as tableTransactions,
  categories as tableCategories,
  wallets as tableWallets,
} from "~/db/schema.server";
import { getNestedCategories } from "~/lib/category";
import { formatCurrency } from "~/lib/currency";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const url = new URL(args.request.url);
  const searchParamsObj = Object.fromEntries(url.searchParams);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const { category, month, year } = z
    .object({
      category: z.coerce.number().int().catch(-1),
      month: z.coerce.number().int().gte(0).lte(11).catch(currentMonth),
      year: z.coerce.number().int().gte(1900).catch(currentYear),
    })
    .parse(searchParamsObj);

  const date = new Date();
  date.setUTCFullYear(year);
  date.setUTCMonth(month);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);

  const dateMonthLater = new Date();
  dateMonthLater.setUTCFullYear(month === 11 ? year + 1 : year);
  dateMonthLater.setUTCMonth(month === 11 ? 0 : month + 1);
  dateMonthLater.setUTCDate(1);
  dateMonthLater.setUTCHours(0, 0, 0, 0);

  const categoryIds = (
    await db
      .select({ id: tableCategories.id })
      .from(tableCategories)
      .where(
        and(
          eq(tableCategories.userId, userId),
          eq(tableCategories.parentId, category),
        ),
      )
  )
    .map((c) => c.id)
    .concat([category]);

  const tableCategoryParent = alias(tableCategories, "parent");
  const transactionsPromise = db
    .select({
      id: tableTransactions.id,
      cents: tableTransactions.cents,
      type: tableTransactions.type,
      description: tableTransactions.description,
      timestamp: tableTransactions.timestamp,
      wallet: {
        id: tableWallets.id,
        name: tableWallets.name,
      },
      category: {
        id: tableCategories.id,
        title: tableCategories.title,
      },
      categoryParent: {
        id: tableCategoryParent.id,
        title: tableCategoryParent.title,
      },
    })
    .from(tableTransactions)
    .where(
      and(
        eq(tableTransactions.userId, userId),
        gte(tableTransactions.timestamp, date),
        lt(tableTransactions.timestamp, dateMonthLater),
        category === -1
          ? undefined
          : inArray(tableTransactions.categoryId, categoryIds),
      ),
    )
    .innerJoin(
      tableCategories,
      eq(tableTransactions.categoryId, tableCategories.id),
    )
    .leftJoin(
      tableCategoryParent,
      eq(tableCategories.parentId, tableCategoryParent.id),
    )
    .innerJoin(tableWallets, eq(tableTransactions.walletId, tableWallets.id))
    .orderBy(desc(tableTransactions.timestamp));
  const categoriesPromise = getNestedCategories(userId);
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
    .from(tableTransactions)
    .groupBy(tableTransactions.userId)
    .where(eq(tableTransactions.userId, userId));

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

  const colors = ["indigo.6", "yellow.6", "teal.6", "gray.6"];
  const donnutData = transactions.reduce<DonutChartCell[]>((acc, t) => {
    const category = t.categoryParent ?? t.category;
    const index = acc.findIndex((cell) => cell.name === category.title);
    if (index === -1) {
      acc.push({
        name: category.title,
        value: t.cents,
        color: colors.shift()!,
      });
    } else {
      acc[index].value += t.cents;
    }
    return acc;
  }, []);

  return json(
    {
      transactions,
      categories,
      wallets,
      defaultCategory: category,
      balance,
      donnutData,
    },
    200,
  );
}
export type IndexLoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

const columnHelper =
  createColumnHelper<IndexLoaderData["transactions"][number]>();

const columns = [
  columnHelper.accessor("timestamp", {
    header: "Date",
    cell: (info) => dayjs(info.getValue()).format("L HH:mm"),
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
      <Text
        style={{ fontSize: "inherit" }}
        c={row.original.type === "income" ? "green" : "red"}
      >
        {formatCurrency(getValue())}
      </Text>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({
      row: { original, index },
      table: {
        options: { meta },
      },
    }) => {
      return (
        <div className="flex gap-2">
          <ActionIcon
            variant="outline"
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (meta as any)?.onClickEdit(index);
            }}
          >
            <IconPencil size="1rem" />
          </ActionIcon>
          <DeleteButton id={original.id} />
        </div>
      );
    },
  }),
];

export default function Index() {
  const {
    transactions,
    categories,
    wallets,
    defaultCategory,
    balance,
    donnutData,
  } = useLoaderData<typeof loader>();
  const [opened, { open, close }] = useDisclosure(false);
  const [editTransactionIndex, setEditTransactionIndex] = useState<
    number | null
  >(null);
  const formRef = useRef<HTMLFormElement>(null);

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      onClickEdit: (index: number) => {
        open();
        setEditTransactionIndex(index);
      },
    },
  });

  return (
    <>
      <Card mb={16} shadow="xs" radius="md" w={200}>
        <Stack gap="sm">
          <Text size="sm">Current Balance</Text>
          <Text fw={500}>{formatCurrency(balance)}</Text>
        </Stack>
      </Card>

      <Form
        ref={formRef}
        method="post"
        className="mb-5 flex items-end space-x-2 w-[180x]"
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
          {categories.map((category, index) => (
            <Fragment key={index}>
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
              {category.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {`•\u00A0\u00A0${child.title}`}
                </option>
              ))}
            </Fragment>
          ))}
        </NativeSelect>

        <button type="submit" className="sr-only">
          Filter
        </button>
      </Form>

      <Button
        onClick={() => {
          setEditTransactionIndex(null);
          open();
        }}
      >
        Create Transaction
      </Button>

      <Box>
        <DonutChart
          data={donnutData}
          valueFormatter={(v) => formatCurrency(v)}
        />
      </Box>

      {transactions.length > 0 ? (
        <div className="relative mt-3 overflow-x-auto shadow-md sm:rounded-lg">
          <Table striped verticalSpacing="sm">
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-col mt-10">
          <SavingsIllustration width={200} height="100%" />
          <Text mt={24}>{"You don't have transactions yet"}</Text>
        </div>
      )}

      <UpsertTransactionModal
        opened={opened}
        onClose={close}
        categories={categories}
        wallets={wallets}
        transaction={
          editTransactionIndex === null
            ? null
            : transactions[editTransactionIndex]
        }
      />
    </>
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
      <ActionIcon variant="subtle" color="red" disabled={loading} type="submit">
        <IconTrash size="1rem" />
      </ActionIcon>
    </fetcher.Form>
  );
};

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const { category } = z
    .object({ category: z.coerce.number().int().catch(-1) })
    .parse(formObj);

  if (category !== -1) searchParams.set("category", category.toString());
  else searchParams.delete("category");

  return redirect(`/app?${searchParams.toString()}`);
}
