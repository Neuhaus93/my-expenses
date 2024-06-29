import { Form } from "@remix-run/react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export const CreateExpenseDialog = ({
  categories,
}: {
  categories: Array<{ title: string; id: number }>;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Expense</DialogTitle>
        </DialogHeader>

        <Form method="post" action="/my-action">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Category
              </Label>
              <select
                id="category"
                name="category"
                defaultValue={categories[0].id}
                className="col-span-3"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue="Pedro Duarte"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                defaultValue="@peduarte"
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="default" type="submit">
              Save changes
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
