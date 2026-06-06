import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUser } from "../db.js";
import { backToMenuKeyboard } from "../keyboards.js";

export function registerWalletHandler(bot: Telegraf<Context>) {
  bot.action("wallet", async (ctx) => {
    await ctx.answerCbQuery();
    const user = await getUser(ctx.from!.id);

    const text =
      `💰 <b>Wallet</b>\n\n` +
      `Available Points: <b>${user?.points ?? 0}</b>\n` +
      `Total Earned: <b>${user?.totalEarned ?? 0}</b>\n` +
      `Total Redeemed: <b>${user?.totalRedeemed ?? 0}</b>`;

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
