from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
import os
from web3 import Web3
import time

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CONTRACT_ADDRESS = "0xEa86B2d60029bEE76F6858a1Ac7f85B2944004bF"
RPC_URL = "https://rpc.testnet.arc.network"
USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

w3 = Web3(Web3.HTTPProvider(RPC_URL))

user_wallets = {}      # telegram_id -> wallet
pending_links = {}     # telegram_id -> wallet (در انتظار تأیید)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Send your wallet address to link it with this Telegram account.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    if text.startswith("0x") and len(text) == 42:
        pending_links[user_id] = text
        keyboard = [
            [InlineKeyboardButton("✅ Confirm Link", callback_data="confirm_link")],
            [InlineKeyboardButton("❌ Cancel", callback_data="cancel_link")]
        ]
        await update.message.reply_text(f"Do you want to link this wallet?\n{text}", reply_markup=InlineKeyboardMarkup(keyboard))
        return

    await update.message.reply_text("Send wallet address to link.")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "confirm_link":
        if user_id in pending_links:
            user_wallets[user_id] = pending_links[user_id]
            await query.edit_message_text(f"✅ Wallet linked permanently!\n{user_wallets[user_id]}")
            del pending_links[user_id]
    elif query.data == "cancel_link":
        await query.edit_message_text("❌ Cancelled.")
        if user_id in pending_links:
            del pending_links[user_id]

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    print("Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
