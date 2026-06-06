import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import {
  getUser,
  createUser,
  createReferral,
  getAllChannels,
  hasJoinRequest,
  awardReferralPoints,
  getReferral,
  updateUser,
} from "../db.js";
import { joinCheckKeyboard, mainMenuKeyboard } from "../keyboards.js";
import type { Channel } from "@workspace/db/schema";

const ADMIN_ID = Number(process.env.ADMIN_ID);

async function checkMembership(
  bot: Telegraf<Context>,
  userId: number,
  channel: Channel
): Promise<boolean> {
  try {
    const member = await bot.telegram.getChatMember(
      channel.channelId,
      userId
    );
    if (["member", "administrator", "creator"].includes(member.status)) {
      return true;
    }
  } catch {
  }

  if (channel.isPrivate) {
    return hasJoinRequest(userId, channel.channelId);
  }

  return false;
}

export async function checkAllChannels(
  bot: Telegraf<Context>,
  userId: number
): Promise<{ allJoined: boolean; missing: Channel[] }> {
  const channelList = await getAllChannels();
  if (channelList.length === 0) return { allJoined: true, missing: [] };

  const missing: Channel[] = [];
  for (const ch of channelList) {
    const joined = await checkMembership(bot, userId, ch);
    if (!joined) missing.push(ch);
  }

  return { allJoined: missing.length === 0, missing };
}

export async function sendChannelJoinPrompt(
  ctx: Context,
  missing: Channel[]
) {
  const lines = missing
    .map((ch) => {
      if (ch.isPrivate && ch.inviteLink) {
        return `• <a href="${ch.inviteLink}">${ch.channelName}</a> 🔒`;
      }
      const link = ch.channelId.startsWith("@")
        ? `https://t.me/${ch.channelId.slice(1)}`
        : ch.inviteLink ?? "#";
      return `• <a href="${link}">${ch.channelName}</a>`;
    })
    .join("\n");

  await ctx.reply(
    `⚠️ <b>You must join all required channels to continue.</b>\n\n` +
      `Please join the following:\n\n${lines}\n\n` +
      `After joining, press the button below.`,
    {
      parse_mode: "HTML",
      ...joinCheckKeyboard(),
      link_preview_options: { is_disabled: true },
    }
  );
}

export async function sendMainMenu(ctx: Context) {
  await ctx.reply(
    `🏠 <b>Main Menu</b>\n\nWelcome to SHEIN SOA Rewards! Choose an option:`,
    { parse_mode: "HTML", ...mainMenuKeyboard() }
  );
}

export function registerStartHandler(bot: Telegraf<Context>) {
  bot.start(async (ctx) => {
    const tgUser = ctx.from;
    const payload = ctx.startPayload;
    const userId = tgUser.id;

    let referredBy: number | null = null;
    if (payload && /^\d+$/.test(payload)) {
      const referrerId = Number(payload);
      if (referrerId !== userId) {
        referredBy = referrerId;
      }
    }

    const existingUser = await getUser(userId);
    const isNewUser = !existingUser;

    if (isNewUser) {
      await createUser({
        id: userId,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        referredBy,
      });

      if (referredBy) {
        const referrerUser = await getUser(referredBy);
        if (referrerUser) {
          await createReferral(referredBy, userId);
          await bot.telegram.sendMessage(
            referredBy,
            `👀 A user joined through your referral link.\nYou will receive <b>1 point</b> after their successful verification.`,
            { parse_mode: "HTML" }
          );
        }
      }

      const refText = referredBy
        ? `YES (Referrer ID: <code>${referredBy}</code>)`
        : "NO";
      let adminLog =
        `🆕 <b>New User</b>\n\n` +
        `Name: ${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}\n` +
        `Username: ${tgUser.username ? "@" + tgUser.username : "—"}\n` +
        `ID: <code>${userId}</code>\n` +
        `Referral: ${refText}`;

      if (referredBy) {
        const referrer = await getUser(referredBy);
        if (referrer) {
          adminLog +=
            `\n\nReferrer: ${referrer.firstName}${referrer.lastName ? " " + referrer.lastName : ""}\n` +
            `Referrer ID: <code>${referredBy}</code>`;
        }
      }

      await bot.telegram.sendMessage(ADMIN_ID, adminLog, {
        parse_mode: "HTML",
      }).catch(() => {});
    } else {
      await createUser({
        id: userId,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
      });
    }

    await ctx.reply(
      `👋 <b>Welcome to SHEIN SOA Rewards!</b>\n\nEarn points by referring friends and redeem them for exclusive SHEIN coupon codes.`,
      { parse_mode: "HTML" }
    );

    const { allJoined, missing } = await checkAllChannels(bot, userId);

    if (allJoined) {
      const user = await getUser(userId);
      if (!user?.verified) {
        await updateUser(userId, { verified: true });
        await onVerificationComplete(bot, userId);
      }
      await sendMainMenu(ctx);
    } else {
      await sendChannelJoinPrompt(ctx, missing);
    }
  });

  bot.action("check_join", async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from!.id;

    const { allJoined, missing } = await checkAllChannels(bot, userId);

    if (!allJoined) {
      await ctx.answerCbQuery("❌ You haven't joined all channels yet!", {
        show_alert: true,
      });
      try {
        await ctx.editMessageText(
          `⚠️ <b>Still missing some channels.</b>\n\nPlease join:\n\n` +
            missing
              .map((ch) => {
                const link =
                  ch.isPrivate && ch.inviteLink
                    ? ch.inviteLink
                    : ch.channelId.startsWith("@")
                    ? `https://t.me/${ch.channelId.slice(1)}`
                    : ch.inviteLink ?? "#";
                return `• <a href="${link}">${ch.channelName}</a>${ch.isPrivate ? " 🔒" : ""}`;
              })
              .join("\n") +
            `\n\nAfter joining, press the button again.`,
          {
            parse_mode: "HTML",
            ...joinCheckKeyboard(),
            link_preview_options: { is_disabled: true },
          }
        );
      } catch {
        await sendChannelJoinPrompt(ctx, missing);
      }
      return;
    }

    const user = await getUser(userId);
    if (!user?.verified) {
      await updateUser(userId, { verified: true });
      await onVerificationComplete(bot, userId);
    }

    try {
      await ctx.editMessageText(
        `✅ <b>Verification successful!</b>\n\nWelcome to SHEIN SOA Rewards!`,
        { parse_mode: "HTML" }
      );
    } catch {
    }

    await sendMainMenu(ctx);
  });
}

export async function onVerificationComplete(
  bot: Telegraf<Context>,
  userId: number
) {
  const user = await getUser(userId);

  await bot.telegram.sendMessage(
    ADMIN_ID,
    `✅ <b>User Verified</b>\n\n` +
      `Name: ${user?.firstName ?? "Unknown"}${user?.lastName ? " " + user.lastName : ""}\n` +
      `Username: ${user?.username ? "@" + user.username : "—"}\n` +
      `ID: <code>${userId}</code>`,
    { parse_mode: "HTML" }
  ).catch(() => {});

  const referral = await getReferral(userId);
  if (referral && !referral.pointsAwarded) {
    await awardReferralPoints(userId);
    await bot.telegram.sendMessage(
      referral.referrerId,
      `🎉 <b>Congratulations!</b> Your referral completed verification and you earned <b>1 point</b>!`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  }
}
