import { Outlet, useLocation } from "@remix-run/react";
import { File, Inbox } from "lucide-react";
import { Nav } from "~/components/nav";

export default function SidebarLayout() {
  const isCollapsed = false;
  const location = useLocation();

  function getVariant(path: string) {
    return location.pathname === path ? "default" : "ghost";
  }

  return (
    <div className="flex">
      <Nav
        isCollapsed={isCollapsed}
        links={[
          {
            title: "Dashboard",
            icon: Inbox,
            variant: getVariant("/app"),
            href: "/app",
          },
          {
            title: "Categories",
            icon: File,
            variant: getVariant("/app/categories"),
            href: "/app/categories",
          },
          {
            title: "Wallets",
            icon: File,
            variant: getVariant("/app/wallets"),
            href: "/app/wallets",
          },
        ]}
      />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
