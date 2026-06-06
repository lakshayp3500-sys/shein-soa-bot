import { Markup } from "telegraf";

export const mainMenuKeyboard = () =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("🎁 Redeem", "redeem"),
      Markup.button.callback("🔗 Refer & Earn", "refer"),
    ],
    [
      Markup.button.callback("💰 Wallet", "wallet"),
      Markup.button.callback("👤 My Profile", "profile"),
    ],
    [
      Markup.button.callback("🎟 Your Codes", "codes"),
      Markup.button.callback("🆘 Support", "support"),
    ],
  ]);

export const backToMenuKeyboard = () =>
  Markup.inlineKeyboard([[Markup.button.callback("🔙 Back", "main_menu")]]);

export const joinCheckKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("✅ I Joined", "check_join")],
  ]);

export const redeemKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("🎟 Redeem Code", "do_redeem")],
    [Markup.button.callback("🔙 Back", "main_menu")],
  ]);

export const referKeyboard = (botUsername: string, userId: number) =>
  Markup.inlineKeyboard([
    [
      Markup.button.url(
        "📤 Share Referral Link",
        `https://t.me/share/url?url=https://t.me/${botUsername}?start=${userId}&text=Join+SHEIN+SOA+Rewards+and+earn+free+codes!`
      ),
    ],
    [Markup.button.callback("🔙 Back", "main_menu")],
  ]);

export const adminKeyboard = () =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("➕ Add Channel", "admin_add_channel"),
      Markup.button.callback("➖ Remove Channel", "admin_remove_channel"),
    ],
    [
      Markup.button.callback("➕ Add Coupon", "admin_add_coupon"),
      Markup.button.callback("➖ Remove Coupon", "admin_remove_coupon"),
    ],
    [
      Markup.button.callback("📊 Statistics", "admin_stats"),
      Markup.button.callback("📢 Broadcast", "admin_broadcast"),
    ],
    [
      Markup.button.callback("👥 Users", "admin_users"),
      Markup.button.callback("⚙ Settings", "admin_settings"),
    ],
  ]);

export const backToAdminKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("🔙 Admin Panel", "admin_panel")],
  ]);
