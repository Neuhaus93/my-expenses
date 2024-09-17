import {
  ActionIcon,
  Avatar,
  Box,
  Card,
  Chip,
  Container,
  Flex,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { UpsertCategoryModal } from "~/components/upsert-category-modal";
import { getNestedCategories } from "~/lib/category";
import { auth } from "~/services/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  const { id: userId } = await auth.isAuthenticated(args.request, {
    failureRedirect: "/sign-in",
  });

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
  const [categoryToUpdate, setCategoryToUpdate] = useState<
    CategoriesLoaderData["nestedCategories"][number] | null
  >(null);

  const handleUpdateClick = (
    category: CategoriesLoaderData["nestedCategories"][number],
  ) => {
    setCategoryToUpdate(category);
  };

  return (
    <Container>
      <Title order={2} mb="lg" ta="center">
        Categories
      </Title>

      <Group mt="lg">
        <UpsertCategoryModal
          type={type}
          parentCategories={nestedCategories}
          category={categoryToUpdate}
        />

        <SegmentedControl
          size="sm"
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
      </Group>

      <Stack mt="lg" gap="sm">
        {nestedCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            onUpdate={handleUpdateClick}
          />
        ))}
      </Stack>
    </Container>
  );
}

const CategoryItem = ({
  category,
  onUpdate,
}: {
  category: CategoriesLoaderData["nestedCategories"][number];
  onUpdate: (
    category: CategoriesLoaderData["nestedCategories"][number],
  ) => void;
}) => {
  const colorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });

  return (
    <Card withBorder shadow="sm" radius="md">
      <Flex align="center">
        <Stack flex={1} gap="sm">
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
              <Chip
                key={child.id}
                variant={colorScheme === "dark" ? "filled" : "outline"}
                checked
                radius="sm"
                color={colorScheme === "dark" ? "gray" : "cyan"}
                readOnly
                style={{ pointerEvents: "none" }}
                icon={
                  <img
                    alt="category icon"
                    src={`/assets/categories/${child.iconName}`}
                    width="14"
                    height="14"
                  />
                }
              >
                {child.title}
              </Chip>
            ))}
          </Group>
        </Stack>
        <ActionIcon
          variant="subtle"
          size="lg"
          radius="xl"
          color="dark"
          onClick={() => onUpdate(category)}
        >
          <IconPencil size="1.2rem" />
        </ActionIcon>
        <DeleteButton id={category.id} />
      </Flex>
    </Card>
  );
};

const DeleteButton = ({ id }: { id: number }) => {
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

  useEffect(() => {
    if (!fetcher.data) return;

    const data = z
      .discriminatedUnion("ok", [
        z.object({ ok: z.literal(false), message: z.string() }),
        z.object({ ok: z.literal(true) }),
      ])
      .catch({ ok: false, message: "Something went wrong, please try again" })
      .parse(fetcher.data);

    notifications.show({
      title: data.ok ? "Category deleted" : "Error deleting the category",
      message: data.ok ? undefined : data.message,
      position: "top-right",
      color: data.ok ? "green" : "red",
    });
  }, [fetcher.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirm("Are you sure you want to delete this category?")) {
      fetcher.submit(event.currentTarget, {
        action: `/category/${id}/delete`,
        method: "POST",
      });
    }
  };

  return (
    <Box mr="xs">
      <fetcher.Form method="post" onSubmit={handleSubmit}>
        <input hidden name="id" defaultValue={id} />
        <ActionIcon
          variant="subtle"
          size="lg"
          radius="xl"
          color="dark"
          disabled={loading}
          type="submit"
        >
          <IconTrash size="1.4rem" />
        </ActionIcon>
      </fetcher.Form>
    </Box>
  );
};
