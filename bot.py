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
user_wallets = {}      # ذخیره والت هر کاربر
user_pending = {}      # ذخیره تراکنش در انتظار تأیید

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot!\n\n"
        "Send your wallet address (0x...) to connect.\n"
        "Then send your split intent."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    # اتصال والت
    if text.startswith("0x") and len(text) == 42:
        user_wallets[user_id] = text
        await update.message.reply_text(f"✅ Wallet Connected!\n{text}")
        return

    if user_id not in user_wallets:
        await update.message.reply_text("❌ First send your wallet address (0x...)")
        return

    # Parsing intent
    await update.message.reply_text("⏳ Parsing your intent...")

    # ساده parse (بعداً Gemini اضافه می‌کنیم)
    addresses = [addr for addr in text.split() if addr.startswith("0x")]
    percentages = [int(p.replace("%","").replace("٪","")) for p in text.split() if p.replace("%","").replace("٪","").isdigit() and int(p.replace("%","").replace("٪","")) <= 100]
    
    if len(addresses) < 2 or len(percentages) < 2:
        await update.message.reply_text("❌ Could not parse intent properly.")
        return

    total = 10  # default
    user_pending[user_id] = {"addresses": addresses, "percentages": percentages, "total": total}

    # دکمه تأیید
    keyboard = [
        [InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"Parsed Successfully!\n"
        f"Amount: {total} USDC\n"
        f"Split: {percentages}%\n\n"
        f"Send from wallet: {user_wallets[user_id]}",
        reply_markup=reply_markup
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
    await query.edit_message_text("🚀 Sending transaction...")

    try:
        # اینجا بعداً کد کامل ارسال تراکنش اضافه می‌شود
        await query.message.reply_text("✅ Transaction sent successfully! (در حال تکمیل)")
    except Exception as e:
        await query.message.reply_text(f"❌ Error: {str(e)}")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
