import { pgTable, serial, bigint, text, timestamp } from "drizzle-orm/pg-core";

export const joinRequests = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  channelId: text("channel_id").notNull(),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
});

export type JoinRequest = typeof joinRequests.$inferSelect;
