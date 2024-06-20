import * as React from "react";
import { forwardRef } from "react";
import { tv } from "tailwind-variants";

const styles = tv({
  base: "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800",
});

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return <button ref={ref} className={styles({ className })} {...props} />;
});
Button.displayName = "Button";
