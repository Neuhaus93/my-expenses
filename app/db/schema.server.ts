import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
});

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  categories: many(categories),
}));

export const transactions = pgTable("transaction", {
  id: serial("id").primaryKey(),
  cents: integer("cents").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  description: text("description"),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const categories = pgTable("category", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  transactions: many(transactions),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));
