import { getAuth } from "@clerk/remix/ssr.server";
import { List } from "@mantine/core";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CreateCategoryModal } from "~/components/create-category-modal";
import { getNestedCategories } from "~/lib/category";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const nestedCategories = await getNestedCategories(userId);
  return { nestedCategories };
}

export default function CategoriesPage() {
  const { nestedCategories } = useLoaderData<typeof loader>();

  return (
    <div className="mx-4 my-6">
      <h1 className="mb-3 text-lg font-semibold">Categories Page</h1>

      <CreateCategoryModal />

      <List mt="lg">
        {nestedCategories.map((category) => (
          <List.Item key={category.id}>
            {category.title}
            {category.children.length > 0 && (
              <List>
                {category.children.map((child) => (
                  <List.Item key={child.id}>{child.title}</List.Item>
                ))}
              </List>
            )}
          </List.Item>
        ))}
      </List>
    </div>
  );
}
