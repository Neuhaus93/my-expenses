import { Button, Group, TextInput } from "@mantine/core";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { z } from "zod";
import { auth } from "~/services/auth.server";

export const loader = async (args: LoaderFunctionArgs) => {
  await auth.isAuthenticated(args.request, {
    successRedirect: "/app",
  });
  return null;
};

export default function SignInPage() {
  const navigation = useNavigation();
  const actionData = useActionData();

  const { email } = z
    .object({ errors: z.record(z.string(), z.array(z.string())) })
    .transform((v) => v.errors)
    .catch({})
    .parse(actionData);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <Form method="post">
        <TextInput
          label="Email"
          description="If the email doesn't exist, a new user will be created"
          type="email"
          name="email"
          required
          min={1}
          error={email?.[0]}
        />

        <Group justify="flex-end" mt="sm">
          <Button
            type="submit"
            ml="auto"
            disabled={navigation.state !== "idle"}
          >
            Submit
          </Button>
        </Group>
      </Form>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.clone().formData();
  const safeParse = z.string().email().safeParse(formData.get("email"));
  if (!safeParse.success) {
    return json({ errors: { email: ["Invalid email"] } });
  }

  return await auth.authenticate("form", request, {
    successRedirect: "/app",
  });
};
