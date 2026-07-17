from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

# ذخیره‌سازی
user_wallets = {}           # user_id → wallet address (متصل شده)
pending_wallets = {}        # user_id → wallet address (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot!\n\n"
        "Send your wallet address (0x...) to connect it to your Telegram account.\n"
        "You can then use split commands here too."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id
    username = update.message.from_user.username or "Unknown"

    if text.startswith("0x") and len(text) == 42:
        pending_wallets[user_id] = text
        keyboard = [
            [InlineKeyboardButton("✅ Confirm Connection", callback_data=f"confirm_{user_id}")],
            [InlineKeyboardButton("❌ Reject", callback_data="reject")]
        ]
        await update.message.reply_text(
            f"🔗 New Connection Request\n\n"
            f"Wallet: {text}\n"
            f"Telegram: @{username}\n\n"
            f"Do you want to connect this wallet to your Telegram?",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return

    # اگر والت متصل باشه
    if user_id in user_wallets:
        await update.message.reply_text("✅ Your wallet is connected.\nSend split intent like: Send 50 USDC, 40% to 0x..., 60% to 0x...")
    else:
        await update.message.reply_text("Please send your wallet address (0x...) first.")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data.startswith("confirm_"):
        wallet = pending_wallets.get(user_id)
        if wallet:
            user_wallets[user_id] = wallet
            await query.edit_message_text(f"✅ Wallet successfully connected!\n{wallet}")
            await query.message.reply_text("Now you can send split commands here.")
        return

    if query.data == "reject":
        await query.edit_message_text("❌ Connection rejected.")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
