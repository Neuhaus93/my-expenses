import { UserButton } from "@clerk/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/db/config.server";
import { transactions } from "~/db/schema.server";

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const response = await db.select().from(transactions);

  return json(response, 200);
}

export default function Index() {
  const transactions = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Index route</h1>
      <p>You are signed in!</p>

      {JSON.stringify(transactions)}
      <UserButton />
    </div>
  );
}
