import { getAuth } from "@clerk/remix/ssr.server";
import { Box, List, SegmentedControl, Title } from "@mantine/core";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { z } from "zod";
import { CreateCategoryModal } from "~/components/create-category-modal";
import { getNestedCategories } from "~/lib/category";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const url = new URL(args.request.url);
  const type = z
    .enum(["income", "expense"])
    .catch("expense")
    .parse(url.searchParams.get("type"));

  const nestedCategories = await getNestedCategories(userId, type);
  return { type, nestedCategories };
}

export default function CategoriesPage() {
  const { type, nestedCategories } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  return (
    <div>
      <Title order={2} mb="lg">
        Categories
      </Title>

      <CreateCategoryModal type={type} parentCategories={nestedCategories} />

      <Box mt="lg">
        <SegmentedControl
          value={type}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value === "income") prev.set("type", "income");
              else prev.delete("type");
              return prev;
            });
          }}
          data={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
        />
      </Box>

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
