import { relations } from "drizzle-orm";
import {
  foreignKey,
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
  wallets: many(wallets),
}));

export const wallets = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  initialBalance: integer("initial_balance").default(0).notNull(),
});

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactions = pgTable("transaction", {
  id: serial("id").primaryKey(),
  cents: integer("cents").notNull(),
  type: text("type", { enum: ["income", "expense", "transference"] }).notNull(),
  description: text("description"),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  walletId: integer("wallet_id")
    .references(() => wallets.id)
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
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

export const categories = pgTable(
  "category",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    parentId: integer("parent_id"),
  },
  (table) => ({
    parentReference: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "parent_fk",
    }),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  transactions: many(transactions),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
}));

export type SelectTransaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;
