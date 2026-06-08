import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import {
  getStats,
  getAllUsers,
  addCoupons,
  getUnusedCoupons,
  removeCouponByCode,
  getAllChannels,
  addChannel,
  removeChannelById,
  getAllVerifiedUserIds,
  getSetting,
  setSetting,
} from "../db.js";
import { adminKeyboard, backToAdminKeyboard } from "../keyboards.js";

const ADMIN_ID = Number(process.env.ADMIN_ID);

type AdminStep =
  | "add_coupon"
  | "add_channel"
  | "broadcast"
  | "broadcast_confirm"
  | "set_redeem_points";

interface AdminState {
  step: AdminStep;
  data?: { messageId?: number; chatId?: number };
}

const adminStateMap = new Map<number, AdminState>();

export function getAdminState(userId: number): AdminState | null {
  return adminStateMap.get(userId) ?? null;
}

export function clearAdminState(userId: number) {
  adminStateMap.delete(userId);
}

export function setBroadcastConfirmState(
  userId: number,
  messageId: number,
  chatId: number
) {
  adminStateMap.set(userId, {
    step: "broadcast_confirm",
    data: { messageId, chatId },
  });
}

export function isAdmin(userId: number) {
  return userId === ADMIN_ID;
}

export async function handleAdminTextInput(
  bot: Telegraf<Context>,
  ctx: Context,
  text: string
): Promise<boolean> {
  const userId = ctx.from!.id;
  const state = adminStateMap.get(userId);
  if (!state) return false;

  if (state.step === "add_coupon") {
    const codes = text
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const unique = [...new Set(codes)];
    const added = await addCoupons(unique);
    adminStateMap.delete(userId);
    await ctx.reply(
      `✅ <b>Coupons Added!</b>\n\n📥 Submitted: <b>${unique.length}</b> codes\n✅ Added to stock: <b>${added}</b>\n🚫 Duplicates removed automatically.`,
      { parse_mode: "HTML", ...adminKeyboard() }
    );
    return true;
  }

  if (state.step === "add_channel") {
    const parts = text.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      await ctx.reply(
        `❌ <b>Invalid format.</b>\n\nUse:\n<b>Public:</b>\n<code>@username|Channel Name</code>\n\n<b>Private:</b>\n<code>-100XXXXXXXXX|Channel Name|private|https://t.me/+xxxxx</code>`,
        { parse_mode: "HTML" }
      );
      return true;
    }
    const [channelId, channelName, type, inviteLink] = parts;
    const isPrivate = type?.toLowerCase() === "private";
    const ch = await addChannel({
      channelId: channelId!,
      channelName: channelName!,
      isPrivate,
      inviteLink: inviteLink ?? null,
    });
    adminStateMap.delete(userId);
    if (ch) {
      await ctx.reply(
        `✅ <b>Channel Added!</b>\n\n📢 ${ch.channelName}\n🆔 <code>${ch.channelId}</code>\n🔐 Type: ${ch.isPrivate ? "Private 🔒" : "Public"}`,
        { parse_mode: "HTML", ...adminKeyboard() }
      );
    } else {
      await ctx.reply(`⚠️ Channel already exists or couldn't be added.`, {
        parse_mode: "HTML",
        ...adminKeyboard(),
      });
    }
    return true;
  }

  if (state.step === "set_redeem_points") {
    const num = parseInt(text.trim(), 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply(
        `❌ Invalid value. Please send a positive number (e.g. <code>10</code>).`,
        { parse_mode: "HTML" }
      );
      return true;
    }
    await setSetting("redeem_points", String(num));
    adminStateMap.delete(userId);
    await ctx.reply(
      `✅ <b>Redeem Points Updated!</b>\n\n🎯 Users now need <b>${num} points</b> to redeem a coupon.`,
      { parse_mode: "HTML", ...adminKeyboard() }
    );
    return true;
  }

  return false;
}

export function registerAdminHandlers(bot: Telegraf<Context>) {
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.reply(`⚙️ <b>Admin Panel</b>\n━━━━━━━━━━━━━━━━━━━━`, {
      parse_mode: "HTML",
      ...adminKeyboard(),
    });
  });

  bot.action("admin_panel", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    adminStateMap.delete(ctx.from!.id);
    try {
      await ctx.editMessageText(`⚙️ <b>Admin Panel</b>\n━━━━━━━━━━━━━━━━━━━━`, {
        parse_mode: "HTML",
        ...adminKeyboard(),
      });
    } catch {
      await ctx.reply(`⚙️ <b>Admin Panel</b>\n━━━━━━━━━━━━━━━━━━━━`, {
        parse_mode: "HTML",
        ...adminKeyboard(),
      });
    }
  });

  bot.action("admin_stats", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const stats = await getStats();
    const redeemPts = await getSetting("redeem_points", "10");
    const text =
      `📊 <b>Statistics</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👥 Total Users: <b>${stats.totalUsers}</b>\n` +
      `✅ Verified: <b>${stats.verifiedUsers}</b>\n` +
      `❌ Unverified: <b>${stats.unverifiedUsers}</b>\n\n` +
      `🔗 Total Referrals: <b>${stats.totalReferrals}</b>\n` +
      `🎟 Total Redeems: <b>${stats.totalRedeems}</b>\n` +
      `📦 Available Codes: <b>${stats.availCodes}</b>\n` +
      `💰 Points Distributed: <b>${stats.totalPoints}</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 Redeem Threshold: <b>${redeemPts} pts</b>`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...backToAdminKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...backToAdminKeyboard() });
    }
  });

  bot.action("admin_users", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const userList = await getAllUsers(30);
    let text = `👥 <b>Users</b> (last 30)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (userList.length === 0) {
      text += "No users yet.";
    } else {
      text += userList
        .map((u, i) => {
          const name = `${u.firstName}${u.lastName ? " " + u.lastName : ""}`;
          const uname = u.username ? `@${u.username}` : "—";
          return `${i + 1}. ${name} | ${uname} | <code>${u.id}</code> | ${u.verified ? "✅" : "❌"} | ${u.points}pts`;
        })
        .join("\n");
    }
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...backToAdminKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...backToAdminKeyboard() });
    }
  });

  bot.action("admin_add_coupon", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    adminStateMap.set(ctx.from!.id, { step: "add_coupon" });
    const text =
      `➕ <b>Add Coupons</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Send coupon codes, <b>one per line:</b>\n\n` +
      `<code>CODE1\nCODE2\nCODE3</code>\n\n` +
      `Duplicates are removed automatically ✅`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    }
  });

  bot.action("admin_remove_coupon", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const unusedList = await getUnusedCoupons(20);
    if (unusedList.length === 0) {
      try {
        await ctx.editMessageText(`📦 No unused coupon codes in stock.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      } catch {
        await ctx.reply(`📦 No unused coupon codes in stock.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      }
      return;
    }
    const buttons = unusedList.map((c) => [
      Markup.button.callback(`🗑 ${c.code}`, `admin_del_coupon:${c.code}`),
    ]);
    buttons.push([Markup.button.callback("🔙 Admin Panel", "admin_panel")]);
    const text = `➖ <b>Remove Coupon</b>\n\n📦 Stock: <b>${unusedList.length}</b> unused\n\nTap a code to remove it:`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(buttons),
      });
    }
  });

  bot.action(/^admin_del_coupon:(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    const code = ctx.match![1]!;
    await removeCouponByCode(code);
    await ctx.answerCbQuery(`✅ Code removed.`, { show_alert: true });
    const unusedList = await getUnusedCoupons(20);
    if (unusedList.length === 0) {
      try {
        await ctx.editMessageText(`📦 No unused coupon codes remaining.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      } catch {}
      return;
    }
    const buttons = unusedList.map((c) => [
      Markup.button.callback(`🗑 ${c.code}`, `admin_del_coupon:${c.code}`),
    ]);
    buttons.push([Markup.button.callback("🔙 Admin Panel", "admin_panel")]);
    try {
      await ctx.editMessageText(
        `➖ <b>Remove Coupon</b>\n\n📦 Stock: <b>${unusedList.length}</b> unused\n\nTap a code to remove it:`,
        { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
      );
    } catch {}
  });

  bot.action("admin_add_channel", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    adminStateMap.set(ctx.from!.id, { step: "add_channel" });
    const text =
      `➕ <b>Add Channel</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Send channel info in this format:\n\n` +
      `<b>Public channel:</b>\n<code>@username|Channel Name</code>\n\n` +
      `<b>Private channel:</b>\n<code>-100XXXXXXXXX|Channel Name|private|https://t.me/+xxxxx</code>\n\n` +
      `⚠️ Add the bot as admin in the channel first!`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    }
  });

  bot.action("admin_remove_channel", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const channelList = await getAllChannels();
    if (channelList.length === 0) {
      try {
        await ctx.editMessageText(`📋 No channels configured yet.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      } catch {
        await ctx.reply(`📋 No channels configured yet.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      }
      return;
    }
    const buttons = channelList.map((ch) => [
      Markup.button.callback(`🗑 ${ch.channelName}`, `admin_del_channel:${ch.id}`),
    ]);
    buttons.push([Markup.button.callback("🔙 Admin Panel", "admin_panel")]);
    try {
      await ctx.editMessageText(
        `➖ <b>Remove Channel</b>\n\nTap a channel to remove it from force-join:`,
        { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
      );
    } catch {
      await ctx.reply(
        `➖ <b>Remove Channel</b>\n\nTap a channel to remove it from force-join:`,
        { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
      );
    }
  });

  bot.action(/^admin_del_channel:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    const id = Number(ctx.match![1]);
    await removeChannelById(id);
    await ctx.answerCbQuery("✅ Channel removed.", { show_alert: true });
    const channelList = await getAllChannels();
    if (channelList.length === 0) {
      try {
        await ctx.editMessageText(`📋 No channels remaining.`, {
          parse_mode: "HTML",
          ...backToAdminKeyboard(),
        });
      } catch {}
      return;
    }
    const buttons = channelList.map((ch) => [
      Markup.button.callback(`🗑 ${ch.channelName}`, `admin_del_channel:${ch.id}`),
    ]);
    buttons.push([Markup.button.callback("🔙 Admin Panel", "admin_panel")]);
    try {
      await ctx.editMessageText(
        `➖ <b>Remove Channel</b>\n\nTap a channel to remove it:`,
        { parse_mode: "HTML", ...Markup.inlineKeyboard(buttons) }
      );
    } catch {}
  });

  bot.action("admin_broadcast", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    adminStateMap.set(ctx.from!.id, { step: "broadcast" });
    const text =
      `📢 <b>Broadcast Message</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Send any message (text, photo, video, etc.) and it will be forwarded to all verified users.`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    }
  });

  bot.action("admin_broadcast_send", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const state = adminStateMap.get(ctx.from!.id);
    if (
      !state ||
      state.step !== "broadcast_confirm" ||
      !state.data?.messageId ||
      !state.data?.chatId
    ) {
      await ctx.reply("❌ Broadcast session expired. Please try again.", {
        parse_mode: "HTML",
        ...adminKeyboard(),
      });
      return;
    }
    adminStateMap.delete(ctx.from!.id);

    const { messageId, chatId } = state.data;
    const userIds = await getAllVerifiedUserIds();

    try {
      await ctx.editMessageText(
        `📢 Broadcasting to <b>${userIds.length}</b> users...`,
        { parse_mode: "HTML" }
      );
    } catch {}

    let sent = 0;
    let failed = 0;
    for (const uid of userIds) {
      try {
        await bot.telegram.copyMessage(uid, chatId, messageId);
        sent++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    await ctx.reply(
      `✅ <b>Broadcast Complete!</b>\n\n✉️ Sent: <b>${sent}</b>\n❌ Failed: <b>${failed}</b>`,
      { parse_mode: "HTML", ...adminKeyboard() }
    );
  });

  bot.action("admin_set_redeem_points", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const current = await getSetting("redeem_points", "10");
    adminStateMap.set(ctx.from!.id, { step: "set_redeem_points" });
    const text =
      `🎯 <b>Set Redeem Points Threshold</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Current value: <b>${current} points</b>\n\n` +
      `Send the new number of points required to redeem a coupon:\n` +
      `(e.g. send <code>12</code> to require 12 points)`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel", "admin_panel")]]),
      });
    }
  });

  bot.action("admin_settings", async (ctx) => {
    if (!isAdmin(ctx.from!.id)) {
      await ctx.answerCbQuery("❌ Not authorized", { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const channelList = await getAllChannels();
    const redeemPts = await getSetting("redeem_points", "10");
    const chText =
      channelList.length === 0
        ? "No channels configured."
        : channelList
            .map(
              (ch) =>
                `• ${ch.channelName} (<code>${ch.channelId}</code>)${ch.isPrivate ? " 🔒" : ""}`
            )
            .join("\n");
    const text =
      `⚙️ <b>Settings</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 Admin ID: <code>${ADMIN_ID}</code>\n` +
      `🎯 Redeem Points: <b>${redeemPts}</b>\n\n` +
      `<b>Force Join Channels (${channelList.length}):</b>\n${chText}`;
    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...backToAdminKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...backToAdminKeyboard() });
    }
  });
}
