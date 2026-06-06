import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import { getUserRedemptions } from "../db.js";
import { backToMenuKeyboard } from "../keyboards.js";

export function registerCodesHandler(bot: Telegraf<Context>) {
  bot.action("codes", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const redemptionList = await getUserRedemptions(userId);

    let text = `🎟 <b>Your Codes</b>\n\n`;

    if (redemptionList.length === 0) {
      text += `No redeemed codes found.`;
    } else {
      text += redemptionList
        .map((r) => {
          const date = r.redeemedAt.toLocaleDateString("en-GB");
          return (
            `<b>${r.productName}</b>\n` +
            `CODE: <code>${r.code}</code>\n` +
            `Redeemed: ${date}`
          );
        })
        .join("\n\n─────────────\n\n");
    }

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
