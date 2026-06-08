import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";

export function registerSupportHandler(bot: Telegraf<Context>) {
  bot.action("support", async (ctx) => {
    await ctx.answerCbQuery();

    const text =
      `🆘 <b>Support Center</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Need help? We're here for you!\n\n` +
      `📩 Contact our support team:\n` +
      `👉 @CHOCOLOGE\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱ Response time: <b>within 24 hours</b>`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url("📩 Contact Support", "https://t.me/CHOCOLOGE")],
      [Markup.button.callback("🏠 Main Menu", "main_menu")],
    ]);

    try {
      await ctx.editMessageText(text, { parse_mode: "HTML", ...keyboard });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...keyboard });
    }
  });
}
