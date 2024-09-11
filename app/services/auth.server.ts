import { Authenticator } from "remix-auth";
import { DiscordStrategy } from "remix-auth-discord";
import { db } from "~/db/config.server";
import { users } from "~/db/schema.server";
import { env } from "~/env.server";
import { sessionStorage, type SessionData } from "~/services/session.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const auth = new Authenticator<SessionData>(sessionStorage);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DiscordUser = any;

const discordStrategy = new DiscordStrategy(
  {
    clientID: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    callbackURL: "http://localhost:5173/auth/discord/callback",
    // Provide all the scopes you want as an array
    scope: ["identify"],
  },
  async ({ accessToken, refreshToken, profile }): Promise<DiscordUser> => {
    console.log(JSON.stringify(profile));
    let user = await db.query.users.findFirst({
      columns: { id: true },
      where(fields, { eq }) {
        return eq(fields.discordId, profile.id);
      },
    });

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          discordId: profile.id,
        })
        .returning({ id: users.id });
    }

    /**
     * Construct the user profile to your liking by adding data you fetched etc.
     * and only returning the data that you actually need for your application.
     */
    return {
      id: user.id,
      discordId: profile.id,
      // displayName: profile.displayName,
      // avatar: profile.__json.avatar,
      // email: profile.__json.email,
      // locale: profile.__json.locale,
      accessToken,
      refreshToken,
    };
  },
);

auth.use(discordStrategy);
