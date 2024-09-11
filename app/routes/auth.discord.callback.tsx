// app/routes/auth.discord.callback.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { auth } from "~/services/auth.server";

export const loader = ({ request }: LoaderFunctionArgs) => {
  return auth.authenticate("discord", request, {
    successRedirect: "/app",
    failureRedirect: "/sign-in",
  });
};
