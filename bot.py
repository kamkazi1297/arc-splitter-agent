from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

# ذخیره‌سازی
user_wallets = {}      # user_id -> wallet address
pending_connections = {}  # user_id -> wallet address (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot!\n\n"
        "To connect your wallet:\n"
        "1. Go to the website and connect MetaMask\n"
        "2. Send your wallet address here (0x...)\n\n"
        "Then you can split from here too."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    # اتصال والت
    if text.startswith("0x") and len(text) == 42:
        pending_connections[user_id] = text
        keyboard = [
            [InlineKeyboardButton("✅ Confirm Connection", callback_data=f"confirm_{user_id}")],
            [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
        ]
        await update.message.reply_text(
            f"Wallet: {text}\n\nDo you want to connect this wallet to your Telegram?",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return

    await update.message.reply_text("Send your wallet address (0x...) to connect.")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data.startswith("confirm_"):
        wallet = pending_connections.get(user_id)
        if wallet:
            user_wallets[user_id] = wallet
            await query.edit_message_text(f"✅ Wallet successfully connected!\n{wallet}")
            await query.message.reply_text("Now you can send split intents here.")
        return

    if query.data == "cancel":
        await query.edit_message_text("❌ Cancelled.")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
