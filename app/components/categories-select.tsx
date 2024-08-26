import {
  Combobox,
  Group,
  Input,
  InputBase,
  Text,
  useCombobox,
} from "@mantine/core";
import { Fragment, useEffect, useState } from "react";
import { z } from "zod";
import { type NestedCategories } from "~/lib/category";

type SelectedCategory = Pick<
  NestedCategories[number],
  "id" | "title" | "iconName" | "parentId"
>;

export type CategoriesSelectProps = {
  categories: NestedCategories;
  defaultCategoryId?: number | null;
  hideChildren?: boolean;
  label?: string;
  onSubmit?: (categoryId: number) => void;
};

export function CategoriesSelect({
  categories,
  defaultCategoryId = null,
  hideChildren = false,
  label,
  onSubmit,
}: CategoriesSelectProps) {
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.focusTarget();
      setSearch("");
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput();
    },
  });
  const [selectedCategory, setSelectedCategory] = useState(() =>
    defaultCategoryId ? findCategory(categories, defaultCategoryId) : null,
  );

  useEffect(() => {
    if (defaultCategoryId) {
      setSelectedCategory(findCategory(categories, defaultCategoryId));
    }
  }, [defaultCategoryId, categories]);

  const options = categories
    .filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase().trim()),
    )
    .map((item) => (
      <Fragment key={item.id}>
        <Combobox.Option value={String(item.id)}>
          <SelectOption category={item} />
        </Combobox.Option>
        {hideChildren
          ? null
          : item.children?.map((child) => (
              <Combobox.Option value={String(child.id)} key={child.id}>
                <SelectOption category={child} />
              </Combobox.Option>
            ))}
      </Fragment>
    ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        const categoryId = z.coerce.number().int().parse(val);
        const category = findCategory(categories, categoryId);

        setSelectedCategory(category);
        onSubmit?.(category.id);
        combobox.closeDropdown();
      }}
    >
      <input
        name="category"
        value={selectedCategory?.id || ""}
        readOnly
        hidden
      />
      <Combobox.Target>
        <InputBase
          label={label}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none"
        >
          {selectedCategory ? (
            <SelectOption category={{ ...selectedCategory, parentId: null }} />
          ) : (
            <Input.Placeholder>Pick category</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search Category"
        />
        <Combobox.Options>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

const SelectOption = ({
  category: c,
}: {
  category: { title: string; iconName: string; parentId: number | null };
}) => (
  <Group gap="sm">
    <Text component="span" hidden={!c.parentId}>
      {"• "}
    </Text>
    <img
      alt="category icon"
      src={`/assets/categories/${c.iconName}`}
      width="14"
      height="14"
    />
    <Text component="span">{c.title}</Text>
  </Group>
);

function findCategory(categories: NestedCategories, categoryId: number) {
  const flatCategories = categories.reduce<SelectedCategory[]>((acc, cur) => {
    acc.push(cur);
    if (cur.children) {
      acc.push(...cur.children);
    }
    return acc;
  }, []);
  return flatCategories.find((item) => item.id === categoryId)!;
}
