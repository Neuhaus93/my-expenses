import { ColorSchemeToggle } from "../components/color-scheme-toggle";
import { SignOutButton } from "@clerk/remix";
import { AppShell, Burger, Group, NavLink, Text } from "@mantine/core";
import { MonthPickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Form,
  json,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useSearchParams,
} from "@remix-run/react";
import {
  IconLogout,
  IconHome,
  IconCategory,
  IconWallet,
} from "@tabler/icons-react";
import { z } from "zod";

const data = [
  { link: "/app", label: "Dashboard", icon: IconHome },
  { link: "/app/categories", label: "Categories", icon: IconCategory },
  { link: "/app/wallets", label: "Wallets", icon: IconWallet },
];

export async function loader(args: LoaderFunctionArgs) {
  const current = new Date().getMonth();
  const url = new URL(args.request.url);
  const searchParamsObj = Object.fromEntries(url.searchParams);
  const { month } = z
    .object({ month: z.coerce.number().int().gte(0).lte(11).catch(current) })
    .parse(searchParamsObj);

  return json({ month });
}

export default function SidebarLayout() {
  const { month } = useLoaderData<typeof loader>();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  function isActive(link: string) {
    return location.pathname === link;
  }

  return (
    <AppShell
      layout="alt"
      header={{ height: 60 }}
      navbar={{
        width: 180,
        breakpoint: "xs",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group justify="space-between" h="100%" px="md">
          <Group h="100%">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="xs"
              size="sm"
            />
            <Text>My Expenses</Text>
          </Group>
          <MonthSelector month={month} />
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <AppShell.Section grow my="md">
          {data.map((item) => (
            <NavLink
              key={item.link}
              component={Link}
              to={item.link}
              label={item.label}
              leftSection={<item.icon size="1rem" stroke={1.5} />}
              active={isActive(item.link)}
              onClick={close}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section>
          <SignOutButton>
            <NavLink
              component={"button"}
              leftSection={<IconLogout size="1rem" stroke={1.5} />}
              label="Logout"
            />
          </SignOutButton>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export const MonthSelector = ({ month }: { month: number }) => {
  const [, setSearchParams] = useSearchParams();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const date = new Date();
  date.setMonth(month);

  return (
    <Form>
      <MonthPickerInput
        defaultValue={date}
        onChange={(value) => {
          if (value) {
            const newMonth = value.getMonth();
            const newYear = value.getFullYear();

            setSearchParams((prev) => {
              if (newMonth === currentMonth) prev.delete("month");
              else prev.set("month", newMonth.toString());

              if (newYear === currentYear) prev.delete("year");
              else prev.set("year", newYear.toString());

              return prev;
            });
          }
        }}
      />
    </Form>
  );
};
