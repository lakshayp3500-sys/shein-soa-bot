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

    const text =
      `👤 <b>My Profile</b>\n\n` +
      `Name: ${user?.firstName ?? ""}${user?.lastName ? " " + user.lastName : ""}\n` +
      `Username: ${user?.username ? "@" + user.username : "—"}\n` +
      `Telegram ID: <code>${userId}</code>\n` +
      `Registration Date: ${regDate}\n` +
      `Verification: ${user?.verified ? "✅ Verified" : "❌ Not Verified"}\n` +
      `Referrals: ${stats.verified} verified / ${stats.total} total\n` +
      `Available Points: <b>${user?.points ?? 0}</b>`;

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
