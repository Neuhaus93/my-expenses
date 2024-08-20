import { columns } from "./columns";
import { Table } from "@mantine/core";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { IndexLoaderData } from "~/routes/app._index";

export type TransactionsTableProps = {
  transactions: IndexLoaderData["transactions"];
  open: () => void;
  setEditTransactionIndex: (index: number) => void;
};

export const TransactionsTable = ({
  transactions,
  open,
  setEditTransactionIndex,
}: TransactionsTableProps) => {
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
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
