from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

# ذخیره‌سازی
user_wallets = {}        # telegram_user_id → wallet_address
pending_links = {}       # telegram_user_id → wallet_address (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot\n\n"
        "When you link your wallet from the website, I'll send you a confirmation here."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    await update.message.reply_text("I'm waiting for a link request from the website...")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data.startswith("link_"):
        wallet = pending_links.get(user_id)
        if not wallet:
            await query.edit_message_text("Session expired.")
            return

        if query.data == "link_confirm":
            user_wallets[user_id] = wallet
            await query.edit_message_text(f"✅ Wallet linked successfully!\n\n{wallet}")
            del pending_links[user_id]
        else:
            await query.edit_message_text("❌ Linking cancelled.")
            del pending_links[user_id]

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
