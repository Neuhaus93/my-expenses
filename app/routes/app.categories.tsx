import { getAuth } from "@clerk/remix/ssr.server";
import { Table } from "@mantine/core";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { CreateCategoryModal } from "~/components/create-category-modal";
import { db } from "~/db/config.server";
import { categories as categoriesTable } from "~/db/schema.server";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(categoriesTable.title);

  return { categories };
}

export default function CategoriesPage() {
  const { categories } = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 my-6">
      <h1 className="mb-3 text-lg font-semibold">Categories Page</h1>

      <CreateCategoryModal />

      <Table className="mt-2">
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="w-[100px]">Name</Table.Th>
            <Table.Th>Type</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {categories.map((category) => (
            <Table.Tr key={category.id}>
              <Table.Td className="font-medium">{category.title}</Table.Td>
              <Table.Td>{category.type}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
