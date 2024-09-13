import { Button, Group, TextInput } from "@mantine/core";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { auth } from "~/services/auth.server";

export const loader = async (args: LoaderFunctionArgs) => {
  await auth.isAuthenticated(args.request, {
    successRedirect: "/app",
  });
  return null;
};

export default function SignInPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Form method="post">
        <TextInput
          label="Email"
          description="If the email doesn't exist, a new user will be created"
          type="email"
          name="email"
          min={1}
        />

        <Group justify="flex-end" mt="sm">
          <Button type="submit" ml="auto">
            Submit
          </Button>
        </Group>
      </Form>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  return await auth.authenticate("form", request, {
    successRedirect: "/app",
  });
};
