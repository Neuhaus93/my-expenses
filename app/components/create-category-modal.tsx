import { Button, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { z } from "zod";
import { Label } from "~/components/label";

export const CreateCategoryModal = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";

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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-left">
                Name
              </Label>
              <TextInput
                type="text"
                id="title"
                name="title"
                className="col-span-3"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="ml-auto">
            Create Category
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};
