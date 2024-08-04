import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { CreateCategoryDialog } from "~/components/create-category-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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

      <CreateCategoryDialog />

      <Table className="mt-2">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.title}</TableCell>
              <TableCell>{category.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
