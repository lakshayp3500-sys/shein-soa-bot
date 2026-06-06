import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUser, getReferralStats } from "../db.js";
import { referKeyboard, backToMenuKeyboard } from "../keyboards.js";

let botUsername = "";
export function setBotUsername(name: string) {
  botUsername = name;
}

export function registerReferHandler(bot: Telegraf<Context>) {
  bot.action("refer", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const user = await getUser(userId);
    const stats = await getReferralStats(userId);

    const link = `https://t.me/${botUsername}?start=${userId}`;

    const text =
      `🔗 <b>Refer & Earn</b>\n\n` +
      `Your referral link:\n<code>${link}</code>\n\n` +
      `Total Referrals: <b>${stats.total}</b>\n` +
      `Verified Referrals: <b>${stats.verified}</b>\n` +
      `Earned Points: <b>${stats.points}</b>\n\n` +
      `Earn <b>+1 point</b> for every friend who joins and completes verification.`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...referKeyboard(botUsername, userId),
        link_preview_options: { is_disabled: true },
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...referKeyboard(botUsername, userId),
        link_preview_options: { is_disabled: true },
      });
    }
  });
}
