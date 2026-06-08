import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUser, getReferralStats } from "../db.js";
import { backToMenuKeyboard } from "../keyboards.js";

export function registerProfileHandler(bot: Telegraf<Context>) {
  bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const user = await getUser(userId);
    const stats = await getReferralStats(userId);

    const regDate = user?.createdAt
      ? user.createdAt.toLocaleDateString("en-GB")
      : "—";

    const name = `${user?.firstName ?? ""}${user?.lastName ? " " + user.lastName : ""}`;

    const text =
      `👤 <b>My Profile</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🧑 <b>Name:</b> ${name}\n` +
      `🔖 <b>Username:</b> ${user?.username ? "@" + user.username : "—"}\n` +
      `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n` +
      `📅 <b>Member Since:</b> ${regDate}\n` +
      `✅ <b>Status:</b> ${user?.verified ? "Verified ✅" : "Not Verified ❌"}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 <b>Referral Stats</b>\n` +
      `👥 Total Referrals: <b>${stats.total}</b>\n` +
      `✅ Verified: <b>${stats.verified}</b>\n\n` +
      `💰 <b>Available Points:</b> ${user?.points ?? 0}`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...backToMenuKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...backToMenuKeyboard() });
    }
  });
}
