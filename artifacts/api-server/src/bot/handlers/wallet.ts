import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUser, getSetting } from "../db.js";
import { backToMenuKeyboard } from "../keyboards.js";

export function registerWalletHandler(bot: Telegraf<Context>) {
  bot.action("wallet", async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getUser(ctx.from!.id);
    const required = await getSetting("redeem_points", "10");
    const pts = user?.points ?? 0;
    const progressFilled = Math.min(pts, Number(required));
    const bar = `[${"█".repeat(progressFilled)}${"░".repeat(Math.max(0, Number(required) - progressFilled))}]`;

    const text =
      `💰 <b>My Wallet</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💎 <b>Available Points:</b> ${pts}\n` +
      `📈 <b>Total Earned:</b> ${user?.totalEarned ?? 0}\n` +
      `🎟 <b>Total Redeemed:</b> ${user?.totalRedeemed ?? 0}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 Progress to next redeem:\n` +
      `<code>${bar}</code> ${pts}/${required} pts\n\n` +
      `💡 Refer friends to earn more points!`;

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
