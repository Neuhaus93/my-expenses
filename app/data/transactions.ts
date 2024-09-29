import { and, or, desc, inArray, eq, gte, lt, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "~/db/config.server";
import {
  categories as tableCategories,
  transactions as tableTransactions,
  transferences as tableTransferences,
  wallets as tableWallets,
} from "~/db/schema.server";

export async function getTransactions(args: {
  userId: number;
  wallet?: number;
  category?: number;
  year?: number;
  month?: number;
}) {
  const { userId, ...rest } = args;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const { category, wallet, month, year } = z
    .object({
      category: z.coerce.number().int().catch(-1),
      wallet: z.coerce.number().int().catch(-1),
      month: z.coerce.number().int().gte(0).lte(11).catch(currentMonth),
      year: z.coerce.number().int().gte(1900).catch(currentYear),
    })
    .parse(rest);

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

  let categoryIds: number[] = [];
  if (category !== -1) {
    categoryIds = (
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
  }

  const tableCategoryParent = alias(tableCategories, "parent");
  const tableTransactionFrom = alias(tableTransactions, "from");
  const tableTransactionTo = alias(tableTransactions, "to");

  const transactions = await db
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

  return transactions;
}

export async function getBalance({
  userId,
  year,
  month,
}: {
  userId: number;
  year: number;
  month: number;
}) {
  const wallets = await db.query.wallets.findMany({
    columns: { initialBalance: true },
    where(fields, { eq }) {
      return eq(fields.userId, userId);
    },
    orderBy(fields, operators) {
      return [operators.asc(fields.name)];
    },
  });

  const dateMonthLater = new Date();
  dateMonthLater.setUTCFullYear(month === 11 ? year + 1 : year);
  dateMonthLater.setUTCMonth(month === 11 ? 0 : month + 1);
  dateMonthLater.setUTCDate(1);
  dateMonthLater.setUTCHours(0, 0, 0, 0);

  const balanceResult = await db
    .select({ balance: sum(tableTransactions.cents) })
    .from(tableTransactions)
    .groupBy(tableTransactions.userId)
    .where(
      and(
        eq(tableTransactions.userId, userId),
        lt(tableTransactions.timestamp, dateMonthLater),
      ),
    );
  const [{ balance }] = z
    .array(z.object({ balance: z.coerce.number().int() }))
    .length(1)
    .catch([{ balance: 0 }])
    .parse(balanceResult);

  return balance + wallets.reduce((acc, w) => acc + w.initialBalance, 0);
}
