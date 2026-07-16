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

# ذخیره‌سازی
user_wallets = {}      # telegram_id -> wallet_address
pending_transactions = {}  # telegram_id -> transaction data

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to Secure Arc USDC Splitter Bot\n\n"
        "Your wallet is now linked with this Telegram account.\n"
        "Send your split intent normally."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id   # telegram user id

    # اگر آدرس والت فرستاد (برای لینک اولیه)
    if text.startswith("0x") and len(text) == 42:
        user_wallets[user_id] = text
        await update.message.reply_text(f"✅ Wallet linked successfully!\n{text}")
        return

    if user_id not in user_wallets:
        await update.message.reply_text("❌ Please send your wallet address first (0x...)")
        return

    await update.message.reply_text("🔍 Parsing your intent...")

    # Parse ساده
    addresses = [addr for addr in text.split() if addr.startswith("0x") and len(addr) == 42]
    percentages = [int(p.replace("%","").replace("٪","")) for p in text.split() if p.replace("%","").replace("٪","").isdigit()]

    if len(addresses) < 2 or len(percentages) < 2:
        await update.message.reply_text("❌ Could not understand your intent.")
        return

    total = 10
    pending_transactions[user_id] = {"addresses": addresses[:2], "percentages": percentages[:2], "total": total}

    # دکمه تأیید دو مرحله‌ای
    keyboard = [
        [InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]

    await update.message.reply_text(
        f"**Confirm Split**\n\n"
        f"Wallet: {user_wallets[user_id]}\n"
        f"Amount: {total} USDC\n"
        f"Split: {percentages[:2]}%\n\n"
        f"Do you want to send this transaction?",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "cancel":
        await query.edit_message_text("❌ Cancelled.")
        return

    if user_id not in pending_transactions:
        await query.edit_message_text("Session expired.")
        return

    data = pending_transactions[user_id]
    await query.edit_message_text("🚀 Sending transaction on Arc Testnet...")

    try:
        # ارسال واقعی تراکنش (با والت ذخیره شده)
        # فعلاً پیام موفقیت می‌ده (بعداً کامل می‌کنیم)
        await query.message.reply_text(f"✅ Transaction sent successfully from {user_wallets[user_id]}!")
        
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
