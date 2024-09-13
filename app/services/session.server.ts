import { createCookieSessionStorage } from "@remix-run/node";
import { z } from "zod";
import { __prod__ } from "~/constants";
import { env } from "~/env.server";

export const SessionData = z.object({
  id: z.number().int(),
  email: z.string().email().max(255),
});
export type SessionData = z.infer<typeof SessionData>;
export function parseSessionData(data: unknown) {
  return SessionData.parse(data);
}

// export the whole sessionStorage object
export const sessionStorage = createCookieSessionStorage<SessionData>({
  cookie: {
    name: "__session",
    sameSite: "lax", // this helps with CSRF
    path: "/", // remember to add this so the cookie will work in all routes
    httpOnly: true, // for security reasons, make this cookie http only
    secrets: [env.SECRET], // replace this with an actual secret
    secure: __prod__, // enable this in prod only
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
