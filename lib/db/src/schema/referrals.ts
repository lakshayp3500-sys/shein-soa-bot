import { pgTable, serial, bigint, boolean, timestamp } from "drizzle-orm/pg-core";

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: bigint("referrer_id", { mode: "number" }).notNull(),
  refereeId: bigint("referee_id", { mode: "number" }).notNull().unique(),
  pointsAwarded: boolean("points_awarded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
