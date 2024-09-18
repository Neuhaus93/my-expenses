import {
  ActionIcon,
  Button,
  Group,
  Input,
  Modal,
  Popover,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useFetcher } from "@remix-run/react";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CATEGORY_ICON_LIST } from "~/lib/categories";
import { CategoriesLoaderData } from "~/routes/app.categories";

type UpsertCategoryModalProps = {
  category: CategoriesLoaderData["nestedCategories"][number] | null;
  type: "income" | "expense";
};

function getRandomIcon() {
  const randomIndex = Math.floor(Math.random() * CATEGORY_ICON_LIST.length);
  return CATEGORY_ICON_LIST[randomIndex];
}

const getEmptyCategory = () => ({
  id: "new" as number | "new",
  title: "",
  icon: getRandomIcon() as string,
});

export const UpsertCategoryModal = ({
  category,
  type,
}: UpsertCategoryModalProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";
  const [isNew, setIsNew] = useState(true);
  const [categories, setCategories] = useState([getEmptyCategory()]);
  const [openIconsPopover, setOpenIconsPopover] = useState<number | null>(null);
  const isUpdate = !!category && !isNew;

  const closeIconsPopover = () => {
    setOpenIconsPopover(null);
  };

  useEffect(() => {
    if (category) {
      setCategories([
        { id: category.id, title: category.title, icon: category.iconName },
        ...category.children.map((c) => ({
          id: c.id,
          title: c.title,
          icon: c.iconName,
        })),
      ]);
      setIsNew(false);
      open();
    } else {
      setCategories([getEmptyCategory()]);
    }
  }, [category, open]);

  useEffect(() => {
    if (!opened) setOpenIconsPopover(null);
  }, [opened]);

  useEffect(() => {
    const { ok } = z
      .object({ ok: z.boolean() })
      .catch({ ok: false })
      .parse(fetcher.data);

    if (ok) {
      close();
    }
  }, [close, fetcher.data]);

  const handleClickCreate = () => {
    setIsNew(true);
    setCategories([getEmptyCategory()]);
    open();
  };

  return (
    <>
      <Button onClick={handleClickCreate}>Create Category</Button>
      <Modal
        opened={opened}
        onClose={close}
        centered
        title={isUpdate ? "Update Category" : "Create Category"}
      >
        <fetcher.Form
          method="post"
          action={isUpdate ? `/category/${category.id}` : "/category/new"}
          className="flex flex-col"
        >
          <Stack data-mantine-stop-propagation>
            <SegmentedControl
              value={type}
              readOnly
              disabled
              data={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
            <input
              name="category.id"
              hidden
              value={isUpdate ? category.id : "new"}
              readOnly
            />
            <input type="hidden" name="category.type" value={type} />
            <input
              type="hidden"
              name="category.iconName"
              value={categories[0].icon}
            />
            <Text fw={600}>Category</Text>
            <Group>
              <Input.Wrapper label="Icon">
                <IconsPopover
                  opened={openIconsPopover === 0}
                  open={() => setOpenIconsPopover(0)}
                  close={closeIconsPopover}
                  iconName={categories[0].icon}
                  onSelectIcon={(icon) => {
                    setCategories((prev) => {
                      const arr = [...prev];
                      arr[0] = { ...arr[0], icon };
                      return arr;
                    });
                    closeIconsPopover();
                  }}
                />
              </Input.Wrapper>
              <TextInput
                label="Name"
                type="text"
                id="title"
                name="category.title"
                autoComplete="off"
                minLength={1}
                maxLength={255}
                required
                style={{ flex: 1 }}
                value={categories[0].title}
                onChange={(event) => {
                  setCategories((prev) => {
                    const arr = [...prev];
                    arr[0] = { ...arr[0], title: event.target.value };
                    return arr;
                  });
                }}
              />
            </Group>

            <Stack mt="md" gap="sm">
              <Text fw={600}>Subcategories</Text>

              <Stack>
                {categories.slice(1).map((c, index) => (
                  <Group key={index} align="flex-end" gap={0}>
                    <input
                      type="hidden"
                      name={`subcategory.${index}.id`}
                      value={c.id}
                    />
                    <input
                      type="hidden"
                      name={`subcategory.${index}.iconName`}
                      value={c.icon}
                    />
                    <Input.Wrapper label="Icon">
                      <IconsPopover
                        opened={openIconsPopover === index + 1}
                        open={() => setOpenIconsPopover(index + 1)}
                        close={closeIconsPopover}
                        iconName={c.icon}
                        onSelectIcon={(icon) => {
                          setCategories((prev) => {
                            const arr = [...prev];
                            arr[index + 1] = {
                              ...arr[index + 1],
                              icon,
                            };
                            return arr;
                          });
                          closeIconsPopover();
                        }}
                      />
                    </Input.Wrapper>
                    <TextInput
                      ml={16}
                      label="Name"
                      type="text"
                      id="title"
                      name={`subcategory.${index}.title`}
                      autoComplete="off"
                      minLength={1}
                      maxLength={255}
                      required
                      style={{ flex: 1 }}
                      value={c.title}
                      onChange={(event) => {
                        setCategories((prev) => {
                          const arr = [...prev];
                          arr[index + 1] = {
                            ...arr[index + 1],
                            title: event.target.value,
                          };
                          return arr;
                        });
                      }}
                    />
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      radius="xl"
                      color="dark"
                      type="button"
                      w={36}
                      h={36}
                      onClick={() => {
                        setCategories((prev) => {
                          const arr = [...prev];
                          arr.splice(index + 1, 1);
                          return arr;
                        });
                      }}
                    >
                      <IconTrash size="1rem" />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  variant="subtle"
                  size="sm"
                  style={{ width: "fit-content" }}
                  type="button"
                  onClick={() => {
                    setCategories((prev) => [...prev, getEmptyCategory()]);
                  }}
                >
                  Add subcategory
                </Button>
              </Stack>
            </Stack>
          </Stack>

          <Button type="submit" disabled={loading} ml="auto" mt="lg">
            Submit
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};

const IconsPopover = ({
  opened,
  open,
  close,
  iconName,
  onSelectIcon,
}: {
  opened: boolean;
  open: () => void;
  close: () => void;
  iconName: string;
  onSelectIcon: (icon: string) => void;
}) => {
  return (
    <Popover opened={opened} onClose={close} position="right" withArrow>
      <Popover.Target>
        <ActionIcon onClick={open} w={36} h={36} radius="xl" display="block">
          <img
            alt="category icon"
            src={`/assets/categories/${iconName}`}
            width="18"
            height="18"
          />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <ScrollArea h={500} type="auto" px="lg" py="sm">
          <Text fw={700}>Select Icon</Text>
          <SimpleGrid
            mt="sm"
            cols={{ base: 3, xs: 5, sm: 6, md: 7, lg: 8 }}
            spacing="sm"
          >
            {CATEGORY_ICON_LIST.map((i) => (
              <ActionIcon
                key={i}
                w={48}
                h={48}
                radius="xl"
                variant="subtle"
                color="gray"
                onClick={() => onSelectIcon(i)}
              >
                <img
                  alt="category icon"
                  src={`/assets/categories/${i}`}
                  width="26"
                  height="26"
                />
              </ActionIcon>
            ))}
          </SimpleGrid>
        </ScrollArea>
      </Popover.Dropdown>
    </Popover>
  );
};
