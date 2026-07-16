from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os
from web3 import Web3

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"
USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

w3 = Web3(Web3.HTTPProvider(RPC_URL))

user_wallets = {}      # telegram_user_id -> wallet_address
pending_links = {}     # telegram_user_id -> wallet_address (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot\n\n"
        "Send your wallet address (0x...) here to link it with your Telegram account."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    # دریافت آدرس والت برای لینک
    if text.startswith("0x") and len(text) == 42:
        pending_links[user_id] = text
        keyboard = [
            [InlineKeyboardButton("✅ Yes, Link this wallet", callback_data="link_confirm")],
            [InlineKeyboardButton("❌ Cancel", callback_data="link_cancel")]
        ]
        await update.message.reply_text(
            f"🔗 Do you want to link this wallet to your Telegram?\n\n{text}",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return

    await update.message.reply_text("Send your wallet address (0x...) to link it.")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "link_confirm":
        if user_id in pending_links:
            user_wallets[user_id] = pending_links[user_id]
            await query.edit_message_text(f"✅ Wallet linked successfully!\n{user_wallets[user_id]}")
            del pending_links[user_id]
        else:
            await query.edit_message_text("Session expired.")

    elif query.data == "link_cancel":
        await query.edit_message_text("❌ Linking cancelled.")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
