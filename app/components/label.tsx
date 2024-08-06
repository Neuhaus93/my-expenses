import { Text, type TextProps } from "@mantine/core";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

const Label = forwardRef<
  HTMLLabelElement,
  Omit<TextProps, "label"> & ComponentPropsWithoutRef<"label">
>((props, ref) => {
  return (
    <Text
      ref={ref}
      {...props}
      component="label"
      onMouseDown={(event) => {
        // only prevent text selection if clicking inside the label itself
        const target = event.target as HTMLElement;
        if (target.closest("button, input, select, textarea")) return;

        props.onMouseDown?.(event);
        // prevent text selection when double clicking label
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }}
    />
  );
});

Label.displayName = "Label";
export { Label };
