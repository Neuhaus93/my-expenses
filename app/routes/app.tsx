import { SignOutButton } from "@clerk/remix";
import { AppShell, NavLink, Text } from "@mantine/core";
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
  const location = useLocation();

  function isActive(link: string) {
    return location.pathname === link;
  }

  return (
    <AppShell
      navbar={{
        width: 180,
        breakpoint: "sm",
      }}
    >
      <AppShell.Navbar p="xs">
        <AppShell.Section>
          <Text pl={8} fw={500} mt={24} size="lg">
            My Expenses
          </Text>
        </AppShell.Section>
        <AppShell.Section grow my="md">
          {data.map((item) => (
            <NavLink
              key={item.link}
              component={Link}
              to={item.link}
              label={item.label}
              leftSection={<item.icon size="1rem" stroke={1.5} />}
              active={isActive(item.link)}
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
