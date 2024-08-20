import { ActionIcon, Text } from "@mantine/core";
import { useFetcher } from "@remix-run/react";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import dayjs from "dayjs";
import { FormEvent } from "react";
import { formatCurrency } from "~/lib/currency";
import { IndexLoaderData } from "~/routes/app._index";

const columnHelper =
  createColumnHelper<IndexLoaderData["transactions"][number]>();

export const columns = [
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
