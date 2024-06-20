import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const transactions = pgTable("transaction", {
  id: serial("id").primaryKey(),
  cents: integer("cents").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  description: text("description"),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
