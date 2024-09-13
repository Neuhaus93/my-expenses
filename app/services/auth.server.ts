import { eq } from "drizzle-orm";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { z } from "zod";
import { db } from "~/db/config.server";
import { categories, lower, users, wallets } from "~/db/schema.server";
import { sessionStorage, type SessionData } from "~/services/session.server";

// strategies will return and will store in the session
export const auth = new Authenticator<SessionData>(sessionStorage);

auth.use(
  new FormStrategy(async ({ form }) => {
    const email = z.string().email().parse(form.get("email"));

    let [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(lower(users.email), email.toLowerCase()));

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email })
        .returning({ id: users.id, email: users.email });

      // Create one wallet for the user
      await db.insert(wallets).values({
        userId: user.id,
        name: "Bank",
      });

      // Create an income and an expense category for the user
      await db.insert(categories).values([
        {
          title: "House",
          userId: user.id,
          type: "expense",
          iconName: "house.png",
        },
        {
          title: "Salary",
          userId: user.id,
          type: "income",
          iconName: "dollar-coin.png",
        },
      ]);

      // Create unique categories for user
      await db.insert(categories).values([
        {
          title: "_TRANSACTION-IN",
          type: "income",
          userId: user.id,
          unique: "transaction_in",
          iconName: "bill.png",
        },
        {
          title: "_TRANSACTION-OUT",
          type: "expense",
          userId: user.id,
          unique: "transaction_out",
          iconName: "bill.png",
        },
      ]);
    }

    return user;
  }),
);
