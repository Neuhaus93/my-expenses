import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export const loader = () => {
  return redirect("/sign-in");
};

export const action = async (args: ActionFunctionArgs) => {
  await auth.logout(args.request, { redirectTo: "/sign-in" });
};
