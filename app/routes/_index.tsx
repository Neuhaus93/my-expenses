import { getAuth } from "@clerk/remix/ssr.server";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { db } from "~/db/config.server";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const url = new URL(args.request.url);
  const searchParamsObj = Object.fromEntries(url.searchParams);
  const { category } = z
    .object({ category: z.coerce.number().int().catch(-1) })
    .parse(searchParamsObj);

  const transactions = await db.query.transactions.findMany({
    where: (transactions, { and, eq }) => {
      return category === -1
        ? undefined
        : and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, category)
          );
    },
    with: {
      category: true,
    },
  });
  const categories = await db.query.categories.findMany();

  return json({ transactions, categories }, 200);
}

export default function Index() {
  const { transactions, categories } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Index route</h1>

      <Form method="post">
        <select name="category" aria-label="Filter by category">
          <option selected disabled value="">
            Filter by category
          </option>
          <option>All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
        <button type="submit">Filter</button>
      </Form>
      <table>
        <thead>
          <tr>
            {TABLE_COLS.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <th scope="row">{t.category.title}</th>
              <td>{t.description}</td>
              <td>{t.cents}</td>
              <td>{t.timestamp.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  const { category } = z
    .object({ category: z.coerce.number().int().catch(-1) })
    .parse(formObj);

  return redirect(category === -1 ? "/" : `/?category=${category}`);
}

const TABLE_COLS = ["Category", "Description", "Value", "Date"];
