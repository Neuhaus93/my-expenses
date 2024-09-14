import { Button, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { WalletsLoaderData } from "~/routes/app.wallets";

type CreateWalletModalProps = {
  wallet: WalletsLoaderData["wallets"][number] | null;
};

export const UpsertWalletModal = ({ wallet }: CreateWalletModalProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [isNew, setIsNew] = useState(true);
  const fetcher = useFetcher();
  const loading = fetcher.state !== "idle";
  const isUpdate = !!wallet && !isNew;

  useEffect(() => {
    if (wallet) {
      setIsNew(false);
      open();
    }
  }, [wallet, open]);

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
      <Button onClick={handleClickCreate}>Create Wallet</Button>
      <Modal
        opened={opened}
        onClose={close}
        centered
        title={isUpdate ? "Update Wallet" : "Create Wallet"}
      >
        <fetcher.Form
          method="post"
          action={isUpdate ? `/wallet/${wallet.id}` : "/wallet/new"}
          className="flex flex-col"
        >
          <input
            name="id"
            hidden
            value={isUpdate ? wallet.id : "new"}
            readOnly
          />
          <TextInput
            label="Name"
            type="text"
            name="name"
            minLength={1}
            maxLength={255}
            required
            autoComplete="off"
            defaultValue={isUpdate ? wallet.name : ""}
          />

          <Button type="submit" disabled={loading} ml="auto" mt="lg">
            Submit
          </Button>
        </fetcher.Form>
      </Modal>
    </>
  );
};
