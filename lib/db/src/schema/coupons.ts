import { pgTable, serial, text, boolean, bigint, timestamp } from "drizzle-orm/pg-core";

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  productName: text("product_name").notNull().default("SHEIN (SOA)"),
  used: boolean("used").notNull().default(false),
  usedBy: bigint("used_by", { mode: "number" }),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;
