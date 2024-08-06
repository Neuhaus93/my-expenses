import { NavbarSimple } from "../components/navbar-simple/navbar-simple";
import { Outlet } from "@remix-run/react";

export default function SidebarLayout() {
  return (
    <div className="flex">
      <NavbarSimple />
      <div className="flex-1 pl-[180px]">
        <Outlet />
      </div>
    </div>
  );
}
