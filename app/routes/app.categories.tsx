import { getAuth } from "@clerk/remix/ssr.server";
import {
  Avatar,
  Box,
  Card,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
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
export type CategoriesLoaderData = ReturnType<
  typeof useLoaderData<typeof loader>
>;

export default function CategoriesPage() {
  const { type, nestedCategories } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  return (
    <Container>
      <Title order={2} mb="lg" ta="center">
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

      <Stack>
        {nestedCategories.map((category) => (
          <CategoryItem key={category.id} category={category} />
        ))}
      </Stack>
    </Container>
  );
}

const CategoryItem = ({
  category,
}: {
  category: CategoriesLoaderData["nestedCategories"][number];
}) => {
  return (
    <Card padding="sm">
      <Stack>
        <Group>
          <Avatar>
            <img
              alt="category icon"
              src={`/assets/categories/${category.iconName}`}
              width="20"
              height="20"
            />
          </Avatar>

          <Text fw={700}>{category.title}</Text>
        </Group>

        <Group
          gap="sm"
          display={category.children.length === 0 ? "none" : "flex"}
        >
          {category.children.map((child) => (
            <Group
              key={child.id}
              gap="sm"
              bd="1px solid cyan.2"
              style={(theme) => ({
                padding: "2px 8px",
                borderRadius: theme.radius.sm,
              })}
            >
              <img
                alt="category icon"
                src={`/assets/categories/${child.iconName}`}
                width="14"
                height="14"
              />
              <Text size="sm">{child.title}</Text>
            </Group>
          ))}
        </Group>
      </Stack>
    </Card>
  );
};
