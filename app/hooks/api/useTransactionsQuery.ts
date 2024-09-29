import { queryOptions } from "@tanstack/react-query";

type FetchTransactionsArgs = {
  category?: number;
  wallet?: number;
  month?: number;
  year?: number;
};

const fetchTransactions = async (args: FetchTransactionsArgs) => {
  const response = await fetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(args),
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
};

export const transactionsQueryOptions = (args: FetchTransactionsArgs) =>
  queryOptions({
    queryKey: ["transactions", args],
    queryFn: () => fetchTransactions(args),
  });
