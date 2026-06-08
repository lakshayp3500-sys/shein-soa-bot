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
    const member = await bot.telegram.getChatMember(channel.channelId, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      return true;
    }
  } catch {}

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

export async function sendChannelJoinPrompt(ctx: Context, missing: Channel[]) {
  const lines = missing
    .map((ch) => {
      if (ch.isPrivate && ch.inviteLink) {
        return `🔒 <a href="${ch.inviteLink}">${ch.channelName}</a>`;
      }
      const link = ch.channelId.startsWith("@")
        ? `https://t.me/${ch.channelId.slice(1)}`
        : ch.inviteLink ?? "#";
      return `📢 <a href="${link}">${ch.channelName}</a>`;
    })
    .join("\n");

  await ctx.reply(
    `🔐 <b>Channel Verification Required</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `To access SHEIN SOA Rewards, please join our required channels:\n\n` +
      `${lines}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `After joining, press the button below ✅`,
    {
      parse_mode: "HTML",
      ...joinCheckKeyboard(),
      link_preview_options: { is_disabled: true },
    }
  );
}

export async function sendMainMenu(ctx: Context, userId?: number) {
  await ctx.reply(
    `🏠 <b>SHEIN SOA Rewards</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Welcome! Select an option below 👇`,
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
      if (referrerId !== userId) referredBy = referrerId;
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
            `👀 <b>New Referral!</b>\n\nSomeone joined via your link.\nYou'll earn <b>1 point</b> after their verification! 🎉`,
            { parse_mode: "HTML" }
          ).catch(() => {});
        }
      }

      const refText = referredBy
        ? `YES (Referrer ID: <code>${referredBy}</code>)`
        : "NO";
      let adminLog =
        `🆕 <b>New User Joined</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🧑 ${tgUser.first_name}${tgUser.last_name ? " " + tgUser.last_name : ""}\n` +
        `🔖 ${tgUser.username ? "@" + tgUser.username : "—"}\n` +
        `🆔 <code>${userId}</code>\n` +
        `🔗 Referred: ${refText}`;

      if (referredBy) {
        const referrer = await getUser(referredBy);
        if (referrer) {
          adminLog +=
            `\n\n👥 Referrer: ${referrer.firstName}${referrer.lastName ? " " + referrer.lastName : ""}\n` +
            `🆔 <code>${referredBy}</code>`;
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
      `👋 <b>Welcome to SHEIN SOA Rewards!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Earn points by referring friends and redeem them for exclusive <b>SHEIN coupon codes</b> — completely free!\n\n` +
        `🎯 <b>How it works:</b>\n` +
        `• Share your referral link\n` +
        `• Friends join & verify\n` +
        `• Earn <b>1 point</b> per verified referral\n` +
        `• Redeem points for SHEIN codes 🎁\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
      { parse_mode: "HTML" }
    );

    const { allJoined, missing } = await checkAllChannels(bot, userId);

    if (allJoined) {
      const user = await getUser(userId);
      if (!user?.verified) {
        await updateUser(userId, { verified: true });
        await onVerificationComplete(bot, userId);
      }
      await sendMainMenu(ctx, userId);
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
          `⚠️ <b>Still missing some channels!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Please join the following:\n\n` +
            missing
              .map((ch) => {
                const link =
                  ch.isPrivate && ch.inviteLink
                    ? ch.inviteLink
                    : ch.channelId.startsWith("@")
                    ? `https://t.me/${ch.channelId.slice(1)}`
                    : ch.inviteLink ?? "#";
                return `${ch.isPrivate ? "🔒" : "📢"} <a href="${link}">${ch.channelName}</a>`;
              })
              .join("\n") +
            `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
            `After joining, press the button again ✅`,
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
        `🎉 <b>Verification Successful!</b>\n\n` +
          `You're all set! Welcome to SHEIN SOA Rewards 🌟`,
        { parse_mode: "HTML" }
      );
    } catch {}

    await sendMainMenu(ctx, userId);
  });
}

export async function onVerificationComplete(
  bot: Telegraf<Context>,
  userId: number
) {
  const user = await getUser(userId);

  await bot.telegram.sendMessage(
    ADMIN_ID,
    `✅ <b>User Verified</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🧑 ${user?.firstName ?? "Unknown"}${user?.lastName ? " " + user.lastName : ""}\n` +
      `🔖 ${user?.username ? "@" + user.username : "—"}\n` +
      `🆔 <code>${userId}</code>`,
    { parse_mode: "HTML" }
  ).catch(() => {});

  const referral = await getReferral(userId);
  if (referral && !referral.pointsAwarded) {
    await awardReferralPoints(userId);
    await bot.telegram.sendMessage(
      referral.referrerId,
      `🎉 <b>+1 Point Earned!</b>\n\nYour referral just completed verification.\nKeep referring to earn more! 💰`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  }
}
