import { Markup } from "telegraf";

export const mainMenuKeyboard = () =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("🎁 Redeem Code", "redeem"),
      Markup.button.callback("🔗 Refer & Earn", "refer"),
    ],
    [
      Markup.button.callback("💰 My Wallet", "wallet"),
      Markup.button.callback("👤 My Profile", "profile"),
    ],
    [
      Markup.button.callback("🎟 My Codes", "codes"),
      Markup.button.callback("🆘 Support", "support"),
    ],
  ]);

export const backToMenuKeyboard = () =>
  Markup.inlineKeyboard([[Markup.button.callback("🏠 Main Menu", "main_menu")]]);

export const joinCheckKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("✅ I've Joined — Check Now", "check_join")],
  ]);

export const redeemKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("🎟 Claim My Code", "do_redeem")],
    [Markup.button.callback("🏠 Main Menu", "main_menu")],
  ]);

export const referKeyboard = (botUsername: string, userId: number) =>
  Markup.inlineKeyboard([
    [
      Markup.button.url(
        "📤 Share My Referral Link",
        `https://t.me/share/url?url=https://t.me/${botUsername}?start=${userId}&text=🎁 Join Blinkit Rewards and earn free coupon codes!`
      ),
    ],
    [Markup.button.callback("🏠 Main Menu", "main_menu")],
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
      Markup.button.callback("⚙️ Settings", "admin_settings"),
    ],
    [
      Markup.button.callback("🎯 Set Redeem Points", "admin_set_redeem_points"),
    ],
  ]);

export const backToAdminKeyboard = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback("🔙 Back to Admin Panel", "admin_panel")],
  ]);
