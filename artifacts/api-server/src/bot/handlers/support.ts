import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { backToMenuKeyboard } from "../keyboards.js";

export function registerSupportHandler(bot: Telegraf<Context>) {
  bot.action("support", async (ctx) => {
    await ctx.answerCbQuery();

    const text =
      `🆘 <b>Support</b>\n\n` +
      `Need help? Contact us:\n\n` +
      `@CHOCOLOGE`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url("📩 Open Support", "https://t.me/CHOCOLOGE")],
      [Markup.button.callback("🔙 Back", "main_menu")],
    ]);

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...keyboard,
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...keyboard });
    }
  });
}
