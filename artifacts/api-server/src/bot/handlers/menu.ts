import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUser } from "../db.js";
import { mainMenuKeyboard } from "../keyboards.js";

export function registerMenuHandler(bot: Telegraf<Context>) {
  bot.action("main_menu", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const user = await getUser(userId);
    const name = user?.firstName ?? "there";

    const text =
      `🏠 <b>Blinkit Rewards</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👋 Welcome back, <b>${name}</b>!\n\n` +
      `💰 Balance: <b>${user?.points ?? 0} pts</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Select an option below 👇`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...mainMenuKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...mainMenuKeyboard() });
    }
  });
}
