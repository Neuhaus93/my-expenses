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

import { rootAuthLoader } from "@clerk/remix/ssr.server";
// Import ClerkApp
import { ClerkApp } from "@clerk/remix";

import appStylesHref from "./globals.css?url";
// import "./globals.css";

export const meta: MetaFunction = () => [
  {
    charset: "utf-8",
    title: "New Remix App",
    viewport: "width=device-width,initial-scale=1",
  },
];

export const links: LinksFunction = () => [
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
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  return <Outlet />;
}

export default ClerkApp(App);
