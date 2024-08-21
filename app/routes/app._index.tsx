import { TransactionsTable } from "../components/transactions-table";
import { getAuth } from "@clerk/remix/ssr.server";
import { DonutChartCell, PieChart } from "@mantine/charts";
import { Button, Card, Flex, NativeSelect, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { or, and, desc, eq, gte, inArray, lt, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Fragment, useRef, useState } from "react";
import { z } from "zod";
import { SavingsIllustration } from "~/components/illustrations/savings";
import { UpsertTransactionModal } from "~/components/upsert-transaction-modal";
import { db } from "~/db/config.server";
import {
  categories as tableCategories,
  transferences as tableTransferences,
  transactions as tableTransactions,
  wallets as tableWallets,
} from "~/db/schema.server";
import { getNestedCategories } from "~/lib/category";
import { getRandomColor } from "~/lib/color";
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
  const tableTransactionFrom = alias(tableTransactions, "from");
  const tableTransactionTo = alias(tableTransactions, "to");

  const transactionsPromise = db
    .select({
      id: tableTransactions.id,
      cents: tableTransactions.cents,
      type: tableTransactions.type,
      description: tableTransactions.description,
      timestamp: tableTransactions.timestamp,
      isTransference: tableTransactions.isTransference,
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
      transferenceFrom: {
        id: tableTransactionFrom.id,
        walletId: tableTransactionFrom.walletId,
      },
      transferenceTo: {
        id: tableTransactionTo.id,
        walletId: tableTransactionTo.walletId,
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
    .innerJoin(tableWallets, eq(tableTransactions.walletId, tableWallets.id))
    .leftJoin(
      tableCategoryParent,
      eq(tableCategories.parentId, tableCategoryParent.id),
    )
    .leftJoin(
      tableTransferences,
      or(
        eq(tableTransactions.id, tableTransferences.transactionOutId),
        eq(tableTransactions.id, tableTransferences.transactionInId),
      ),
    )
    .leftJoin(
      tableTransactionFrom,
      eq(tableTransferences.transactionOutId, tableTransactionFrom.id),
    )
    .leftJoin(
      tableTransactionTo,
      eq(tableTransferences.transactionInId, tableTransactionTo.id),
    )
    .orderBy(desc(tableTransactions.timestamp), desc(tableTransactions.id));
  const categoriesPromise = getNestedCategories(userId);
  const walletsPromise = db.query.wallets.findMany({
    columns: { id: true, name: true },
    where(fields, { eq }) {
      return eq(fields.userId, userId);
    },
    orderBy(fields, operators) {
      return [operators.asc(fields.name)];
    },
  });
  const balanceResultPromise = db
    .select({ balance: sum(tableTransactions.cents) })
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

  let donnutData = transactions
    .filter((t) => t.type === "expense" && !t.isTransference)
    .map((t) => ({ ...t, cents: -1 * t.cents }))
    .reduce<DonutChartCell[]>((acc, t) => {
      const category = t.categoryParent ?? t.category;
      const index = acc.findIndex((cell) => cell.name === category.title);
      if (index === -1) {
        acc.push({
          name: category.title,
          value: t.cents,
          color: getRandomColor(),
        });
      } else {
        acc[index].value += t.cents;
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  if (donnutData.length > 5) {
    donnutData = donnutData.slice(0, 5).concat([
      {
        name: "Others",
        value: donnutData.slice(5).reduce((acc, c) => acc + c.value, 0),
        color: getRandomColor(),
      },
    ]);
  }

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

      <Flex justify="center" direction="column" align="center">
        <Text size="lg" fw={700}>
          Expenses
        </Text>
        <PieChart
          data={donnutData}
          valueFormatter={(v) => formatCurrency(v)}
          withTooltip
          withLabelsLine
          labelsType="percent"
          withLabels
        />
      </Flex>

      {transactions.length > 0 ? (
        <div className="relative mt-3 overflow-x-auto shadow-md sm:rounded-lg">
          <TransactionsTable
            open={open}
            transactions={transactions}
            setEditTransactionIndex={setEditTransactionIndex}
          />
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
