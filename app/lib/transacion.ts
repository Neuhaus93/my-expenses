import { z } from "zod";

export const TRANSACTION_TYPES = ["expense", "income", "transference"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const isValidTransactionType = (
  type: unknown,
): type is TransactionType => z.enum(TRANSACTION_TYPES).safeParse(type).success;
