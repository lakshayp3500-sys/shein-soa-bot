import { db } from "@workspace/db";
import {
  users,
  channels,
  coupons,
  redemptions,
  referrals,
  joinRequests,
} from "@workspace/db/schema";
import { eq, and, count, sum, isNull } from "drizzle-orm";

export async function getUser(telegramId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, telegramId))
    .limit(1);
  return user ?? null;
}

export async function createUser(data: {
  id: number;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  referredBy?: number | null;
}) {
  const [user] = await db
    .insert(users)
    .values({
      id: data.id,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      username: data.username ?? null,
      referredBy: data.referredBy ?? null,
    })
    .onConflictDoNothing()
    .returning();
  return user ?? null;
}

export async function updateUser(
  telegramId: number,
  data: Partial<{
    firstName: string;
    lastName: string | null;
    username: string | null;
    verified: boolean;
    points: number;
    totalEarned: number;
    totalRedeemed: number;
  }>
) {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, telegramId))
    .returning();
  return user ?? null;
}

export async function addPoints(telegramId: number, pts: number) {
  const user = await getUser(telegramId);
  if (!user) return null;
  return updateUser(telegramId, {
    points: user.points + pts,
    totalEarned: user.totalEarned + pts,
  });
}

export async function deductPoints(telegramId: number, pts: number) {
  const user = await getUser(telegramId);
  if (!user) return null;
  return updateUser(telegramId, {
    points: Math.max(0, user.points - pts),
    totalRedeemed: user.totalRedeemed + pts,
  });
}

export async function getAllChannels() {
  return db.select().from(channels).orderBy(channels.id);
}

export async function addChannel(data: {
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  inviteLink?: string | null;
}) {
  const [ch] = await db
    .insert(channels)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return ch ?? null;
}

export async function removeChannelById(id: number) {
  await db.delete(channels).where(eq(channels.id, id));
}

export async function getAvailableCoupon() {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.used, false))
    .limit(1);
  return coupon ?? null;
}

export async function countAvailableCoupons() {
  const [result] = await db
    .select({ count: count() })
    .from(coupons)
    .where(eq(coupons.used, false));
  return result?.count ?? 0;
}

export async function claimCoupon(couponId: number, userId: number) {
  const [coupon] = await db
    .update(coupons)
    .set({ used: true, usedBy: userId, usedAt: new Date() })
    .where(and(eq(coupons.id, couponId), eq(coupons.used, false)))
    .returning();
  return coupon ?? null;
}

export async function addCoupons(codes: string[], productName = "SHEIN (SOA)") {
  const values = codes.map((code) => ({ code: code.trim(), productName }));
  const inserted = await db
    .insert(coupons)
    .values(values)
    .onConflictDoNothing()
    .returning();
  return inserted.length;
}

export async function removeCouponByCode(code: string) {
  await db
    .delete(coupons)
    .where(and(eq(coupons.code, code), eq(coupons.used, false)));
}

export async function getUnusedCoupons(limit = 50) {
  return db
    .select()
    .from(coupons)
    .where(eq(coupons.used, false))
    .orderBy(coupons.createdAt)
    .limit(limit);
}

export async function getUserRedemptions(userId: number) {
  return db
    .select()
    .from(redemptions)
    .where(eq(redemptions.userId, userId))
    .orderBy(redemptions.redeemedAt);
}

export async function recordRedemption(data: {
  userId: number;
  couponId: number;
  code: string;
  productName: string;
}) {
  const [r] = await db.insert(redemptions).values(data).returning();
  return r;
}

export async function recordJoinRequest(userId: number, channelId: string) {
  await db
    .insert(joinRequests)
    .values({ userId, channelId })
    .onConflictDoNothing();
}

export async function hasJoinRequest(userId: number, channelId: string) {
  const [r] = await db
    .select()
    .from(joinRequests)
    .where(
      and(eq(joinRequests.userId, userId), eq(joinRequests.channelId, channelId))
    )
    .limit(1);
  return !!r;
}

export async function getReferral(refereeId: number) {
  const [r] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);
  return r ?? null;
}

export async function createReferral(referrerId: number, refereeId: number) {
  const [r] = await db
    .insert(referrals)
    .values({ referrerId, refereeId })
    .onConflictDoNothing()
    .returning();
  return r ?? null;
}

export async function awardReferralPoints(refereeId: number) {
  const ref = await getReferral(refereeId);
  if (!ref || ref.pointsAwarded) return null;
  await db
    .update(referrals)
    .set({ pointsAwarded: true })
    .where(eq(referrals.refereeId, refereeId));
  return addPoints(ref.referrerId, 1);
}

export async function getReferralStats(referrerId: number) {
  const all = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, referrerId));
  return {
    total: all.length,
    verified: all.filter((r) => r.pointsAwarded).length,
    points: all.filter((r) => r.pointsAwarded).length,
  };
}

export async function getAllUsers(limit = 30) {
  return db.select().from(users).orderBy(users.createdAt).limit(limit);
}

export async function getStats() {
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [verifiedUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.verified, true));
  const [totalReferrals] = await db.select({ count: count() }).from(referrals);
  const [totalRedeems] = await db.select({ count: count() }).from(redemptions);
  const [availCodes] = await db
    .select({ count: count() })
    .from(coupons)
    .where(eq(coupons.used, false));
  const [pointsSum] = await db
    .select({ total: sum(users.totalEarned) })
    .from(users);

  return {
    totalUsers: totalUsers?.count ?? 0,
    verifiedUsers: verifiedUsers?.count ?? 0,
    unverifiedUsers: (totalUsers?.count ?? 0) - (verifiedUsers?.count ?? 0),
    totalReferrals: totalReferrals?.count ?? 0,
    totalRedeems: totalRedeems?.count ?? 0,
    availCodes: availCodes?.count ?? 0,
    totalPoints: Number(pointsSum?.total ?? 0),
  };
}

export async function getAllVerifiedUserIds() {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.verified, true));
  return result.map((r) => r.id);
}
