import { ActionFunctionArgs, json } from "@remix-run/node";

export default function NewTransaction() {
  return (
    <div>
      <h1>Testing this thing</h1>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const formObj = Object.fromEntries(formData.entries());
  console.log(formObj);

  return json({ success: true });
}
