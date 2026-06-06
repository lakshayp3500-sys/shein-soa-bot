import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import {
  getUser,
  getAvailableCoupon,
  countAvailableCoupons,
  claimCoupon,
  deductPoints,
  recordRedemption,
} from "../db.js";
import { redeemKeyboard, backToMenuKeyboard } from "../keyboards.js";

const ADMIN_ID = Number(process.env.ADMIN_ID);
const REQUIRED_POINTS = 10;
const PRODUCT_NAME = "SHEIN (SOA)";

export function registerRedeemHandler(bot: Telegraf<Context>) {
  bot.action("redeem", async (ctx) => {
    await ctx.answerCbQuery();
    const stock = await countAvailableCoupons();

    const text =
      `🎁 <b>Redeem</b>\n\n` +
      `Product: <b>${PRODUCT_NAME}</b>\n` +
      `Required Points: <b>${REQUIRED_POINTS}</b>\n` +
      `Available Stock: <b>${stock}</b>`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...redeemKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...redeemKeyboard() });
    }
  });

  bot.action("do_redeem", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const user = await getUser(userId);

    if (!user) {
      await ctx.answerCbQuery("❌ User not found.", { show_alert: true });
      return;
    }

    if (user.points < REQUIRED_POINTS) {
      await ctx.answerCbQuery(
        `❌ Insufficient points. You have ${user.points}/${REQUIRED_POINTS} points.`,
        { show_alert: true }
      );
      return;
    }

    const coupon = await getAvailableCoupon();
    if (!coupon) {
      await ctx.answerCbQuery("❌ No codes available right now. Try again later.", {
        show_alert: true,
      });
      return;
    }

    const claimed = await claimCoupon(coupon.id, userId);
    if (!claimed) {
      await ctx.answerCbQuery("❌ Failed to claim code. Please try again.", {
        show_alert: true,
      });
      return;
    }

    await deductPoints(userId, REQUIRED_POINTS);
    await recordRedemption({
      userId,
      couponId: coupon.id,
      code: coupon.code,
      productName: PRODUCT_NAME,
    });

    const text =
      `🎉 <b>Code Redeemed Successfully!</b>\n\n` +
      `Product: <b>${PRODUCT_NAME}</b>\n\n` +
      `Your Code:\n<code>${coupon.code}</code>\n\n` +
      `Save this code. You can also find it in <b>🎟 Your Codes</b>.`;

    try {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        ...backToMenuKeyboard(),
      });
    } catch {
      await ctx.reply(text, { parse_mode: "HTML", ...backToMenuKeyboard() });
    }

    await bot.telegram.sendMessage(
      ADMIN_ID,
      `🎟 <b>Code Redeemed</b>\n\n` +
        `Name: ${user.firstName}${user.lastName ? " " + user.lastName : ""}\n` +
        `Username: ${user.username ? "@" + user.username : "—"}\n` +
        `ID: <code>${userId}</code>\n\n` +
        `Product: <b>${PRODUCT_NAME}</b>\n` +
        `Code: <code>${coupon.code}</code>`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  });
}
