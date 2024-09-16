/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { db } from "~/db/config.server";
import {
  categories,
  transactions,
  transferences,
  wallets,
} from "~/db/schema.server";
import data from "~/expenses-2024-09-13_00_28.json";

export const loader = async (args: LoaderFunctionArgs) => {
  const originalUserId = "user_2i7ipp18qElWdqGJFl9z5oZyL04";
  const userId = 56;

  const mapTransaction = (t: (typeof data)["transactions"][number]) => {
    return {
      id: t.id,
      userId,
      type: t.type as any,
      cents: t.cents,
      walletId: t.walletId,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      timestamp: new Date(t.timestamp),
      categoryId: t.categoryId,
      isTransference: t.isTransference,
    };
  };
  const mapWallet = (w: (typeof data)["wallets"][number]) => ({
    id: w.id,
    name: w.name,
    userId,
    initialBalance: w.initialBalance,
  });
  const mapCategory = (c: (typeof data)["categories"][number]) => ({
    id: c.id,
    title: c.title,
    userId,
    type: c.type as any,
    iconName: c.iconName,
    parentId: c.parentId,
  });
  const mapTransference = (t: (typeof data)["transferences"][number]) => ({
    id: t.id,
    transactionInId: t.transactionInId,
    transactionOutId: t.transactionOutId,
  });

  await db
    .insert(wallets)
    .values(
      data.wallets.filter((w) => w.userId === originalUserId).map(mapWallet),
    );
  await db
    .insert(categories)
    .values(
      data.categories
        .filter((c) => c.userId === originalUserId || c.userId === null)
        .map(mapCategory),
    );
  const filteredTransactions = data.transactions.filter(
    (t) => t.userId === originalUserId,
  );
  const filteredTransactionsIds = filteredTransactions.map((t) => t.id);
  await db
    .insert(transactions)
    .values(filteredTransactions.map(mapTransaction));
  await db
    .insert(transferences)
    .values(
      data.transferences
        .filter((t) => filteredTransactionsIds.includes(t.transactionInId))
        .map(mapTransference),
    );

  return json({ ok: true });
};
