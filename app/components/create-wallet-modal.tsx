import { Button, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { z } from "zod";

export const CreateWalletModal = () => {
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
      <Button onClick={open}>Create Wallet</Button>
      <Modal opened={opened} onClose={close} centered title="Create Wallet">
        <fetcher.Form
          method="post"
          action="/wallet/new"
          className="flex flex-col"
        >
          <TextInput
            label="Name"
            type="text"
            name="name"
            minLength={1}
            maxLength={255}
            required
            autoComplete="off"
          />

          <Button type="submit" disabled={loading} ml="auto" mt="lg">
            Create
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};
