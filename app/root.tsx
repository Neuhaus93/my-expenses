import appStylesHref from "./globals.css?url";
import "@mantine/charts/styles.css";
import { ColorSchemeScript, createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

export const meta: MetaFunction = () => [
  {
    charset: "utf-8",
    title: "My Expenses",
    viewport: "width=device-width,initial-scale=1",
  },
];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
];

const theme = createTheme({});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  return <Outlet />;
}

export default App;
