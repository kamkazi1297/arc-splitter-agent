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

user_wallets = {}      # user_id → wallet address
user_pending = {}      # user_id → transaction data

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

    await update.message.reply_text("⏳ Parsing your intent...")

    # Parse ساده
    addresses = [word for word in text.split() if word.startswith("0x")]
    percentages = [int(word.replace("%","").replace("٪","")) for word in text.split() 
                   if word.replace("%","").replace("٪","").isdigit()]

    if len(addresses) < 2 or len(percentages) < 2:
        await update.message.reply_text("❌ Could not parse intent.")
        return

    total = 50  # پیش‌فرض
    user_pending[user_id] = {
        "addresses": addresses[:2],
        "percentages": percentages[:2],
        "total": total
    }

    keyboard = [
        [InlineKeyboardButton("✅ Confirm & Send", callback_data="confirm")],
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
    ]

    await update.message.reply_text(
        f"✅ Parsed!\n"
        f"Amount: {total} USDC\n"
        f"Split: {percentages[:2]}%\n"
        f"Wallet: {user_wallets[user_id]}",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    user_id = query.from_user.id
    await query.answer()

    if query.data == "cancel":
        await query.edit_message_text("❌ Cancelled.")
        return

    if user_id not in user_pending or user_id not in user_wallets:
        await query.edit_message_text("Session expired.")
        return

    data = user_pending[user_id]
    await query.edit_message_text("🚀 Sending transaction on Arc Testnet...")

    try:
        recipients = data["addresses"]
        percentages = data["percentages"]
        total = int(data["total"]) * 10**6

        account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))
        addr = account.address

        nonce = w3.eth.get_transaction_count(addr, 'pending')

        # Approve
        usdc_abi = [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"}]
        usdc = w3.eth.contract(address=USDC_ADDRESS, abi=usdc_abi)
        tx_approve = usdc.functions.approve(CONTRACT_ADDRESS, total*2).build_transaction({
            'from': addr, 'nonce': nonce, 'gas': 150000, 'gasPrice': w3.eth.gas_price
        })
        signed = w3.eth.account.sign_transaction(tx_approve, os.getenv("PRIVATE_KEY"))
        w3.eth.send_raw_transaction(signed.rawTransaction)

        nonce += 1
        time.sleep(3)

        # Split Payment
        splitter_abi = [{
            "inputs": [
                {"name": "recipients", "type": "address[]"},
                {"name": "percentages", "type": "uint256[]"},
                {"name": "totalAmount", "type": "uint256"}
            ],
            "name": "splitPayment",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }]
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=splitter_abi)
        
        tx = contract.functions.splitPayment(recipients, percentages, total).build_transaction({
            'from': addr, 'nonce': nonce, 'gas': 800000, 'gasPrice': w3.eth.gas_price
        })
        signed_tx = w3.eth.account.sign_transaction(tx, os.getenv("PRIVATE_KEY"))
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        tx_hash_str = tx_hash.hex()
        if not tx_hash_str.startswith('0x'):
            tx_hash_str = "0x" + tx_hash_str

        await query.message.reply_text(
            f"✅ Transaction Sent Successfully!\n\n"
            f"Hash: {tx_hash_str}\n\n"
            f"[🔗 View on Explorer](https://testnet.arcscan.app/tx/{tx_hash_str})"
        )

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
