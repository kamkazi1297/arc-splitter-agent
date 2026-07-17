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

user_wallets = {}
user_pending = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Send your wallet address (0x...) to connect.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    user_id = update.message.from_user.id

    if text.startswith("0x") and len(text) == 42:
        user_wallets[user_id] = text
        await update.message.reply_text(f"✅ Wallet Connected!\n{text}")
        return

    if user_id not in user_wallets:
        await update.message.reply_text("❌ First send your wallet address.")
        return

    await update.message.reply_text("⏳ Parsing...")

    addresses = [addr for addr in text.split() if addr.startswith("0x") and len(addr) == 42]
    percentages = [int(p.replace("%","").replace("٪","")) for p in text.split() if p.replace("%","").replace("٪","").isdigit()]

    if len(addresses) < 2 or len(percentages) < 2:
        await update.message.reply_text("❌ Could not parse.")
        return

    total = 10
    user_pending[user_id] = {"addresses": addresses, "percentages": percentages, "total": total}

    keyboard = [
        [InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]

    await update.message.reply_text(
        f"Confirm Split\n\nWallet: {user_wallets[user_id]}\nAmount: {total} USDC\nSplit: {percentages}%",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "cancel":
        await query.edit_message_text("Cancelled.")
        return

    data = user_pending.get(user_id)
    if not data:
        await query.edit_message_text("Session expired.")
        return

    await query.edit_message_text("🚀 Sending...")

    try:
        recipients = data["addresses"]
        percentages = data["percentages"]
        total = int(data["total"]) * 10**6

        account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))
        addr = account.address
        nonce = w3.eth.get_transaction_count(addr, 'pending')

        # Approve
        usdc = w3.eth.contract(address=USDC_ADDRESS, abi=[{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"}])
        tx = usdc.functions.approve(CONTRACT_ADDRESS, total*2).build_transaction({'from': addr, 'nonce': nonce, 'gas': 150000, 'gasPrice': w3.eth.gas_price})
        signed = w3.eth.account.sign_transaction(tx, os.getenv("PRIVATE_KEY"))
        w3.eth.send_raw_transaction(signed.rawTransaction)
        nonce += 1
        time.sleep(3)

        # Split
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=[{"inputs": [{"name": "recipients", "type": "address[]"}, {"name": "percentages", "type": "uint256[]"}, {"name": "totalAmount", "type": "uint256"}], "name": "splitPayment", "outputs": [], "stateMutability": "nonpayable", "type": "function"}])
        tx = contract.functions.splitPayment(recipients, percentages, total).build_transaction({'from': addr, 'nonce': nonce, 'gas': 800000, 'gasPrice': w3.eth.gas_price})
        signed_tx = w3.eth.account.sign_transaction(tx, os.getenv("PRIVATE_KEY"))
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        await query.message.reply_text(f"✅ Success!\nHash: {tx_hash.hex()}")
    except Exception as e:
        await query.message.reply_text(f"❌ Error: {str(e)}")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(button_callback))
    print("Bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
