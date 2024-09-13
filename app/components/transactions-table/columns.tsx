import { ActionIcon, Avatar, Group, Text } from "@mantine/core";
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
    header: "Description",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("category.title", {
    header: "Category",
    cell: ({ getValue, row }) => {
      const iconName = row.original.category.iconName;
      return (
        <Group gap="xs">
          <Avatar size="sm">
            <img
              alt="category icon"
              src={`/assets/categories/${iconName}`}
              width="15"
              height="15"
            />
          </Avatar>
          <Text>{getValue()}</Text>
        </Group>
      );
    },
  }),
  columnHelper.accessor("wallet.name", {
    header: "Wallet",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("cents", {
    header: "Value",
    cell: ({ getValue, row }) => {
      const type = row.original.type;
      let value = getValue();
      if (type === "expense") value = -value;
      return (
        <Text
          style={{ fontSize: "inherit" }}
          c={type === "income" ? "lime.8" : "red.8"}
        >
          {formatCurrency(value)}
        </Text>
      );
    },
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
