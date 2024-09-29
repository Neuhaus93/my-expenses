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
import {
  ShouldRevalidateFunction,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from "@remix-run/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CategoriesSelect } from "~/components/categories-select";
import { SavingsIllustration } from "~/components/illustrations/savings";
import { UpsertTransactionModal } from "~/components/upsert-transaction-modal";
import { getBalance, getTransactions } from "~/data/transactions";
import { db } from "~/db/config.server";
import { transactionsQueryOptions } from "~/hooks/api/useTransactionsQuery";
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

  const transactionsPromise = getTransactions({
    userId,
    category,
    wallet,
    year,
    month,
  });
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
  const balanceResultPromise = getBalance({
    userId,
    year,
    month,
  });

  const [transactions, categories, wallets, balance] = await Promise.all([
    transactionsPromise,
    categoriesPromise,
    walletsPromise,
    balanceResultPromise,
  ]);
  console.log("This ran");

  return json(
    {
      wallet,
      category,
      transactions,
      categories,
      wallets,
      defaultCategory: category,
      balance,
    },
    200,
  );
}
export type IndexLoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const year = z.coerce
    .number()
    .int()
    .catch(new Date().getFullYear())
    .parse(searchParams.get("year") ?? NaN);
  const month = z.coerce
    .number()
    .int()
    .catch(new Date().getMonth())
    .parse(searchParams.get("month") ?? NaN);
  const { wallet, category, categories, wallets, defaultCategory } = loaderData;
  const [opened, { open, close }] = useDisclosure(false);
  const [editTransactionIndex, setEditTransactionIndex] = useState<
    number | null
  >(null);
  const { data: transactions } = useSuspenseQuery({
    ...transactionsQueryOptions({
      year,
      month,
      wallet,
      category,
    }),
    initialData: loaderData.transactions,
    staleTime: Infinity,
  });
  const { data: balance } = useSuspenseQuery({
    queryKey: ["balance", { year, month }],
    queryFn: async () => {
      const response = await fetch("/api/balance", {
        method: "POST",
        body: JSON.stringify({ year, month }),
        headers: { "Content-Type": "application/json" },
      });
      return response.json();
    },
    initialData: loaderData.balance,
    staleTime: Infinity,
  });

  const {
    totalIncome,
    totalExpense,
    expenseDonutData,
    incomeDonutData,
    areaChartData,
  } = useMemo(() => calculateDashboardData(transactions), [transactions]);
  const categoryFetcher = useFetcher();
  const submit = useSubmit();

  return (
    <>
      <Group mb={16}>
        {[
          {
            title: "Current Balance",
            value:
              typeof balance === "number" ? formatCurrency(balance) : "...",
          },
          { title: "Income", value: formatCurrency(totalIncome) },
          { title: "Expense", value: formatCurrency(totalExpense) },
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

export const shouldRevalidate: ShouldRevalidateFunction = () => {
  return false;
};

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
