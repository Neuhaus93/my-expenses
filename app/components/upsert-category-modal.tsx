import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Input,
  Modal,
  NativeSelect,
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
import { useEffect, useState } from "react";
import { z } from "zod";
import type { SelectCategory } from "~/db/schema.server";
import { CATEGORY_ICON_LIST } from "~/lib/categories";
import { CategoriesLoaderData } from "~/routes/app.categories";

type UpsertCategoryModalProps = {
  category: CategoriesLoaderData["nestedCategories"][number] | null;
  type: "income" | "expense";
  parentCategories: Pick<SelectCategory, "id" | "title">[];
};

function getRandomIcon() {
  const randomIndex = Math.floor(Math.random() * CATEGORY_ICON_LIST.length);
  return CATEGORY_ICON_LIST[randomIndex];
}

export const UpsertCategoryModal = ({
  category,
  type,
  parentCategories,
}: UpsertCategoryModalProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [
    iconsPopoverOpen,
    { open: openIconsPopover, close: closeIconsPopover },
  ] = useDisclosure(false);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";
  const [isNew, setIsNew] = useState(true);
  const [isParent, setIsParent] = useState(true);
  const [iconName, setIconName] = useState<string>(getRandomIcon);
  const isUpdate = !!category && !isNew;

  useEffect(() => {
    if (category) {
      setIconName(category.iconName);
      setIsNew(false);
      open();
    } else {
      setIconName(getRandomIcon);
    }
  }, [category, open]);

  useEffect(() => {
    if (!opened && iconsPopoverOpen) closeIconsPopover();
  }, [closeIconsPopover, iconsPopoverOpen, opened]);

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
              name="id"
              hidden
              value={isUpdate ? category.id : "new"}
              readOnly
            />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="iconName" value={iconName} />
            <Group>
              <Input.Wrapper label="Icon">
                <Popover
                  opened={iconsPopoverOpen}
                  onClose={closeIconsPopover}
                  position="right"
                  withArrow
                >
                  <Popover.Target>
                    <ActionIcon
                      onClick={openIconsPopover}
                      w={36}
                      h={36}
                      radius="xl"
                      display="block"
                    >
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
                            onClick={() => {
                              setIconName(i);
                              closeIconsPopover();
                            }}
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
              </Input.Wrapper>
              <TextInput
                label="Name"
                type="text"
                id="title"
                name="title"
                autoComplete="off"
                minLength={1}
                maxLength={255}
                required
                style={{ flex: 1 }}
                defaultValue={isUpdate ? category.title : ""}
              />
            </Group>

            <Checkbox
              size="md"
              label="Is Parent Category"
              name="isParent"
              checked={isParent}
              onChange={(event) => setIsParent(event.currentTarget.checked)}
            />

            <Box h={60.8} hidden={!isParent} />
            <Box hidden={isParent}>
              <NativeSelect
                id="parent-category"
                name="parent"
                defaultValue={parentCategories[0].id}
                label="Parent"
              >
                {parentCategories.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </NativeSelect>
            </Box>
          </Stack>

          <Button type="submit" disabled={loading} ml="auto" mt="lg">
            Create
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};
