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

user_wallets = {}  # ذخیره آدرس والت هر کاربر

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Arc USDC Splitter Bot!\n\n"
        "First, connect your wallet in the web app, then send your wallet address here.\n\n"
        "Example intent:\nSend 50 USDC, 40% to 0x123..., 60% to 0x456..."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    user_id = update.message.from_user.id

    # اگر آدرس والت فرستاد
    if text.startswith("0x") and len(text) == 42:
        user_wallets[user_id] = text
        await update.message.reply_text(f"✅ Wallet connected:\n{text}")
        return

    if user_id not in user_wallets:
        await update.message.reply_text("❌ First send your wallet address (0x...)")
        return

    # Parsing و ارسال تراکنش
    await update.message.reply_text("⏳ Parsing...")

    # فعلاً ساده parse می‌کنیم (بعداً Gemini اضافه می‌کنیم)
    # ... (کد parse و ارسال تراکنش)

    await update.message.reply_text("✅ Transaction sent! (در حال تکمیل)")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
