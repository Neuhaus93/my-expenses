import { ColorSchemeToggle } from "../components/color-scheme-toggle";
import { SignOutButton } from "@clerk/remix";
import { AppShell, Burger, Group, NavLink, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link, Outlet, useLocation } from "@remix-run/react";
import {
  IconLogout,
  IconHome,
  IconCategory,
  IconWallet,
} from "@tabler/icons-react";

const data = [
  { link: "/app", label: "Dashboard", icon: IconHome },
  { link: "/app/categories", label: "Categories", icon: IconCategory },
  { link: "/app/wallets", label: "Wallets", icon: IconWallet },
];

export default function SidebarLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  function isActive(link: string) {
    return location.pathname === link;
  }

  return (
    <AppShell
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
