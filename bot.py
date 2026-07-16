from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

user_wallets = {}      # telegram_id -> wallet
pending_links = {}     # telegram_id -> wallet (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Secure Arc Splitter Bot\n\n"
        "When you send a link request from the website, I'll ask you to confirm."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    await update.message.reply_text("Waiting for link request from website...")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "confirm_link":
        if user_id in pending_links:
            user_wallets[user_id] = pending_links[user_id]
            await query.edit_message_text(f"✅ Wallet successfully linked!\n\n{user_wallets[user_id]}")
            del pending_links[user_id]
        else:
            await query.edit_message_text("Session expired.")

    elif query.data == "cancel_link":
        await query.edit_message_text("❌ Link cancelled.")
        if user_id in pending_links:
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
