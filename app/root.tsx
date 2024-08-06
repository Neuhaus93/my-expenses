import { TooltipProvider } from "./components/ui/tooltip";
import appStylesHref from "./globals.css?url";
import { MuiDocument } from "./mui/MuiDocument";
import { MuiMeta } from "./mui/MuiMeta";
import { getMuiLinks } from "./mui/getMuiLinks";
// Import ClerkApp
import { ClerkApp } from "@clerk/remix";
import { rootAuthLoader } from "@clerk/remix/ssr.server";
import { CssBaseline } from "@mui/material";
import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export const meta: MetaFunction = () => [
  {
    charset: "utf-8",
    title: "My Expenses",
    viewport: "width=device-width,initial-scale=1",
  },
];

export const links: LinksFunction = () => [
  ...getMuiLinks(),
  { rel: "stylesheet", href: appStylesHref },
];

export const loader: LoaderFunction = (args) => rootAuthLoader(args);

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <MuiMeta />
        <Links />
      </head>
      <body className="bg-blue-50">
        {children}
        <CssBaseline />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  return (
    <MuiDocument>
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    </MuiDocument>
  );
}

export default ClerkApp(App);
