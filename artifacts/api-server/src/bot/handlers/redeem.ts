import { Telegraf } from "telegraf";
import type { Context } from "telegraf";
import {
  getUser,
  getAvailableCoupon,
  countAvailableCoupons,
  claimCoupon,
  deductPoints,
  recordRedemption,
  getSetting,
} from "../db.js";
import { redeemKeyboard, backToMenuKeyboard } from "../keyboards.js";

const ADMIN_ID = Number(process.env.ADMIN_ID);
const PRODUCT_NAME = "SHEIN (SOA)";

export function registerRedeemHandler(bot: Telegraf<Context>) {
  bot.action("redeem", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;
    const user = await getUser(userId);
    const stock = await countAvailableCoupons();
    const required = Number(await getSetting("redeem_points", "10"));
    const pts = user?.points ?? 0;
    const needed = Math.max(0, required - pts);

    const text =
      `🎁 <b>Redeem Coupon Code</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🏷 <b>Product:</b> ${PRODUCT_NAME}\n` +
      `⭐ <b>Required Points:</b> ${required}\n` +
      `📦 <b>Stock Available:</b> ${stock} codes\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>Your Points:</b> ${pts}\n` +
      (needed > 0
        ? `⚠️ You need <b>${needed} more point(s)</b> to redeem.`
        : `✅ You have enough points to redeem!`);

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
    const required = Number(await getSetting("redeem_points", "10"));

    if (!user) {
      await ctx.answerCbQuery("❌ User not found.", { show_alert: true });
      return;
    }

    if (user.points < required) {
      await ctx.answerCbQuery(
        `❌ Not enough points! You have ${user.points}/${required} pts.`,
        { show_alert: true }
      );
      return;
    }

    const coupon = await getAvailableCoupon();
    if (!coupon) {
      await ctx.answerCbQuery("❌ No codes in stock right now. Try later!", {
        show_alert: true,
      });
      return;
    }

    const claimed = await claimCoupon(coupon.id, userId);
    if (!claimed) {
      await ctx.answerCbQuery("❌ Failed to claim. Please try again.", {
        show_alert: true,
      });
      return;
    }

    await deductPoints(userId, required);
    await recordRedemption({
      userId,
      couponId: coupon.id,
      code: coupon.code,
      productName: PRODUCT_NAME,
    });

    const text =
      `🎉 <b>Code Redeemed Successfully!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🏷 <b>Product:</b> ${PRODUCT_NAME}\n\n` +
      `🎟 <b>Your Code:</b>\n` +
      `<code>${coupon.code}</code>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 Save this code — you can also find it in <b>🎟 My Codes</b>.`;

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
        `👤 ${user.firstName}${user.lastName ? " " + user.lastName : ""}\n` +
        `🔖 ${user.username ? "@" + user.username : "—"}\n` +
        `🆔 <code>${userId}</code>\n\n` +
        `🏷 <b>Product:</b> ${PRODUCT_NAME}\n` +
        `🔑 <b>Code:</b> <code>${coupon.code}</code>`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  });
}
