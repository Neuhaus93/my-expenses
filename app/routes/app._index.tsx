import { TransactionsTable } from "../components/transactions-table";
import { AreaChart, PieChart } from "@mantine/charts";
import { Button, Card, Flex, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useFetcher, useLoaderData, useSubmit } from "@remix-run/react";
import { and, desc, eq, gte, inArray, lt, or, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { useState } from "react";
import { z } from "zod";
import { CategoriesSelect } from "~/components/categories-select";
import { SavingsIllustration } from "~/components/illustrations/savings";
import { UpsertTransactionModal } from "~/components/upsert-transaction-modal";
import { db } from "~/db/config.server";
import {
  categories as tableCategories,
  transactions as tableTransactions,
  transferences as tableTransferences,
  wallets as tableWallets,
} from "~/db/schema.server";
import { getNestedCategories } from "~/lib/category";
import { formatCurrency } from "~/lib/currency";
import { calculateDashboardData } from "~/lib/transacion";
import { auth } from "~/services/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

  const url = new URL(args.request.url);
  const searchParamsObj = Object.fromEntries(url.searchParams);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const { category, wallet, month, year } = z
    .object({
      category: z.coerce.number().int().catch(-1),
      wallet: z.coerce.number().int().catch(-1),
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
        iconName: tableCategories.iconName,
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
        wallet === -1 ? undefined : eq(tableTransactions.walletId, wallet),
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
    columns: { id: true, name: true, initialBalance: true },
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

  const {
    totalIncome,
    totalExpense,
    expenseDonutData,
    incomeDonutData,
    areaChartData,
  } = calculateDashboardData(transactions);

  return json(
    {
      transactions,
      categories,
      wallets,
      defaultCategory: category,
      balance: balance + wallets.reduce((acc, w) => acc + w.initialBalance, 0),
      income: totalIncome,
      expense: totalExpense,
      expenseDonutData,
      incomeDonutData,
      areaChartData,
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
    income,
    expense,
    expenseDonutData,
    incomeDonutData,
    areaChartData,
  } = useLoaderData<typeof loader>();
  const [opened, { open, close }] = useDisclosure(false);
  const [editTransactionIndex, setEditTransactionIndex] = useState<
    number | null
  >(null);
  const categoryFetcher = useFetcher();
  const submit = useSubmit();

  return (
    <>
      <Group mb={16}>
        {[
          { title: "Current Balance", value: formatCurrency(balance) },
          { title: "Income", value: formatCurrency(income) },
          { title: "Expense", value: formatCurrency(expense) },
        ].map(({ title, value }) => (
          <Card key={title} withBorder shadow="xs" radius="md" w={200}>
            <Stack gap="sm">
              <Text size="sm">{title}</Text>
              <Text fw={500}>{value}</Text>
            </Stack>
          </Card>
        ))}
      </Group>

      <categoryFetcher.Form style={{ width: 220 }}>
        <CategoriesSelect
          label="Filter by Category"
          defaultCategoryId={defaultCategory}
          hideChildren
          categories={[
            {
              id: -1,
              title: "All Categories",
              iconName: "bill.png",
              children: [],
              parentId: null,
              type: "expense",
            },
            ...categories,
          ]}
          onSubmit={(category) => submit({ category }, { method: "post" })}
        />
      </categoryFetcher.Form>

      <Button
        mt="lg"
        onClick={() => {
          setEditTransactionIndex(null);
          open();
        }}
      >
        Create Transaction
      </Button>

      <Group gap="xl" justify="center">
        <Flex justify="center" direction="column" align="center">
          <Text size="lg" fw={700}>
            Expenses
          </Text>
          <PieChart
            data={expenseDonutData}
            valueFormatter={(v) => formatCurrency(v)}
            withTooltip
            withLabelsLine
            labelsType="percent"
            withLabels
          />
        </Flex>
        <Flex justify="center" direction="column" align="center">
          <Text size="lg" fw={700}>
            Income
          </Text>
          <PieChart
            data={incomeDonutData}
            valueFormatter={(v) => formatCurrency(v)}
            withTooltip
            withLabelsLine
            labelsType="percent"
            withLabels
          />
        </Flex>
      </Group>
      <Stack mt="lg" justify="center" align="center" ml={40} mr={8}>
        <AreaChart
          h={260}
          data={areaChartData}
          valueFormatter={(v) => formatCurrency(v)}
          dataKey="date"
          series={[
            { name: "Expense", color: "red.6" },
            { name: "Income", color: "green.6" },
          ]}
          curveType="monotone"
        />
      </Stack>

      {transactions.length > 0 ? (
        <div className="relative mt-6 overflow-x-auto shadow-md sm:rounded-lg">
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
    .object({ category: z.coerce.number().int() })
    .parse(formObj);

  if (category !== -1) searchParams.set("category", category.toString());
  else searchParams.delete("category");

  return redirect(`/app?${searchParams.toString()}`);
}
