import { Telegraf, Markup } from "telegraf";
import type { Message } from "telegraf/types";
import { logger } from "../lib/logger.js";
import { setBotUsername } from "./handlers/refer.js";
import { registerStartHandler } from "./handlers/start.js";
import { registerMenuHandler } from "./handlers/menu.js";
import { registerWalletHandler } from "./handlers/wallet.js";
import { registerProfileHandler } from "./handlers/profile.js";
import { registerCodesHandler } from "./handlers/codes.js";
import { registerSupportHandler } from "./handlers/support.js";
import { registerReferHandler } from "./handlers/refer.js";
import { registerRedeemHandler } from "./handlers/redeem.js";
import {
  registerAdminHandlers,
  handleAdminTextInput,
  getAdminState,
  setBroadcastConfirmState,
  isAdmin,
} from "./handlers/admin.js";
import { recordJoinRequest } from "./db.js";

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is required");

  const bot = new Telegraf(token);

  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      logger.error({ err }, "Bot error");
      try {
        await ctx.reply("❌ An error occurred. Please try again.");
      } catch {}
    }
  });

  registerStartHandler(bot);
  registerMenuHandler(bot);
  registerWalletHandler(bot);
  registerProfileHandler(bot);
  registerCodesHandler(bot);
  registerSupportHandler(bot);
  registerReferHandler(bot);
  registerRedeemHandler(bot);
  registerAdminHandlers(bot);

  bot.on("chat_join_request", async (ctx) => {
    const userId = ctx.chatJoinRequest.from.id;
    const channelId = String(ctx.chatJoinRequest.chat.id);
    await recordJoinRequest(userId, channelId);
    logger.info({ userId, channelId }, "Join request recorded");
  });

  bot.on("message", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !isAdmin(userId)) return;

    const state = getAdminState(userId);
    if (!state) return;

    const msg = ctx.message as Message;

    if (state.step === "add_coupon" || state.step === "add_channel") {
      const text = "text" in msg ? msg.text : null;
      if (!text) return;
      await handleAdminTextInput(bot, ctx, text);
      return;
    }

    if (state.step === "broadcast") {
      const messageId = msg.message_id;
      const chatId = ctx.chat!.id;
      setBroadcastConfirmState(userId, messageId, chatId);

      await ctx.reply(
        `📢 <b>Confirm Broadcast</b>\n\nThe message above will be sent to all verified users.\n\nProceed?`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Send", "admin_broadcast_send"),
              Markup.button.callback("❌ Cancel", "admin_panel"),
            ],
          ]),
        }
      );
    }
  });

  return bot;
}

export async function launchBot() {
  const bot = createBot();

  const me = await bot.telegram.getMe();
  setBotUsername(me.username ?? "");
  logger.info({ username: me.username }, "Bot launched");

  bot.launch({ dropPendingUpdates: true });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
}
