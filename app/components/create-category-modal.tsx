import {
  Box,
  Button,
  Checkbox,
  Modal,
  NativeSelect,
  SegmentedControl,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { SelectCategory } from "~/db/schema.server";

type CreateCategoryModalProps = {
  type: "income" | "expense";
  parentCategories: Pick<SelectCategory, "id" | "title">[];
};

export const CreateCategoryModal = ({
  type,
  parentCategories,
}: CreateCategoryModalProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";
  const [isParent, setIsParent] = useState(true);

  useEffect(() => {
    const { ok } = z
      .object({ ok: z.boolean() })
      .catch({ ok: false })
      .parse(fetcher.data);

    if (ok) {
      close();
    }
  }, [close, fetcher.data]);

  return (
    <>
      <Button onClick={open}>Create Category</Button>
      <Modal opened={opened} onClose={close} centered title="Create Category">
        <fetcher.Form
          method="post"
          action="/category/new"
          className="flex flex-col"
        >
          <Stack>
            <SegmentedControl
              value={type}
              readOnly
              disabled
              data={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
            <input type="hidden" name="type" value={type} />
            <Box>
              <TextInput
                label="Name"
                type="text"
                id="title"
                name="title"
                minLength={1}
                maxLength={255}
                required
              />
            </Box>

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
            Create Category
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};
