import classes from "./navbar-simple.module.css";
import { SignOutButton } from "@clerk/remix";
import { Group, Button } from "@mantine/core";
import { Link } from "@remix-run/react";
import {
  IconLogout,
  IconHome,
  IconCategory,
  IconWallet,
} from "@tabler/icons-react";
import { useState } from "react";

const data = [
  { link: "/app", label: "Dashboard", icon: IconHome },
  { link: "/app/categories", label: "Categories", icon: IconCategory },
  { link: "/app/wallets", label: "Wallets", icon: IconWallet },
];

export function NavbarSimple() {
  const [active, setActive] = useState("Dashboard");

  const links = data.map((item) => (
    <Link
      className={classes.link}
      data-active={item.label === active || undefined}
      to={item.link}
      key={item.label}
      onClick={() => {
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
          <p>My Expenses</p>
        </Group>
        {links}
      </div>

      <div className={classes.footer}>
        <SignOutButton>
          <Button variant="transparent" fullWidth className={classes.link}>
            <IconLogout className={classes.linkIcon} stroke={1.5} />
            <span>Logout</span>
          </Button>
        </SignOutButton>
      </div>
    </nav>
  );
}
