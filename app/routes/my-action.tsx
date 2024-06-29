import { ActionFunctionArgs, json, redirect } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  console.log(formObj);

  return redirect("/");
}
