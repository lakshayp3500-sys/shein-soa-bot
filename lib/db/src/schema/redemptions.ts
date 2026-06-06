import { pgTable, serial, bigint, integer, text, timestamp } from "drizzle-orm/pg-core";

export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  couponId: integer("coupon_id").notNull(),
  code: text("code").notNull(),
  productName: text("product_name").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = typeof redemptions.$inferInsert;
