import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { mainMenuKeyboard } from "../keyboards.js";

export function registerMenuHandler(bot: Telegraf<Context>) {
  bot.action("main_menu", async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        `🏠 <b>Main Menu</b>\n\nWelcome to SHEIN SOA Rewards! Choose an option:`,
        { parse_mode: "HTML", ...mainMenuKeyboard() }
      );
    } catch {
      await ctx.reply(
        `🏠 <b>Main Menu</b>\n\nWelcome to SHEIN SOA Rewards! Choose an option:`,
        { parse_mode: "HTML", ...mainMenuKeyboard() }
      );
    }
  });
}
