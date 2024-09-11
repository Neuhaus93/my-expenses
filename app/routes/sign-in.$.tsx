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
        <button>Login with Discord</button>
      </Form>
    </div>
  );
}

export const action = ({ request }: ActionFunctionArgs) => {
  return auth.authenticate("discord", request);
};
