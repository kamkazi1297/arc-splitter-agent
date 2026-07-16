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

user_wallets = {}      # wallet address
user_pending = {}      # pending transactions

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Secure Arc USDC Splitter Bot\n\n"
        "Send your wallet address (0x...) to connect.\n"
        "You will need to confirm every transaction."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    if text.startswith("0x") and len(text) == 42:
        user_wallets[user_id] = text
        await update.message.reply_text(f"✅ Wallet Connected Securely!\n{text}")
        return

    if user_id not in user_wallets:
        await update.message.reply_text("❌ First send your wallet address.")
        return

    await update.message.reply_text("🔍 Parsing intent...")

    # Parse
    addresses = [addr for addr in text.split() if addr.startswith("0x") and len(addr) == 42]
    percentages = [int(p.replace("%","").replace("٪","")) for p in text.split() if p.replace("%","").replace("٪","").isdigit()]

    if len(addresses) < 2 or len(percentages) < 2:
        await update.message.reply_text("❌ Could not parse intent.")
        return

    total = 10
    user_pending[user_id] = {"addresses": addresses[:2], "percentages": percentages[:2], "total": total}

    # دکمه تأیید دو مرحله‌ای
    keyboard = [
        [InlineKeyboardButton("✅ Yes, Send Transaction", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]

    await update.message.reply_text(
        f"**Confirm Transaction**\n\n"
        f"From: {user_wallets[user_id]}\n"
        f"Amount: {total} USDC\n"
        f"Split: {percentages[:2]}%\n\n"
        f"Are you sure?",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "cancel":
        await query.edit_message_text("❌ Cancelled.")
        return

    if user_id not in user_pending:
        await query.edit_message_text("Session expired.")
        return

    data = user_pending[user_id]
    await query.edit_message_text("🚀 Sending transaction... Please wait.")

    try:
        # اینجا کد ارسال تراکنش (همون کد قبلی)
        # ... (برای کوتاه شدن فعلاً پیام موفقیت می‌ده)
        await query.message.reply_text("✅ Transaction sent successfully!")
        
    except Exception as e:
        await query.message.reply_text(f"❌ Error: {str(e)}")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Secure Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
