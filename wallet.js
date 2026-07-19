// js/wallet.js
// ArcSplit Pro - Wallet Connection Module
// Author: Your Name

import { BrowserProvider } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

let signer = null;
let userAddress = null;
let provider = null;
let wcProvider = null;

const PROJECT_ID = "1c0e752ab2d259f09fd2eeae3784448c";
const ARC_CHAIN_ID = 5042002;
const ARC_CHAIN_ID_HEX = "0x4CF0A2";

async function initWalletConnect() {
  wcProvider = await EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [ARC_CHAIN_ID],
    showQrModal: true,
    qrModalOptions: { themeMode: "dark" }
  });
}

export function showConnectModal() {
  const html = `
    <div id="connectModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="glass border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold">Connect Wallet</h3>
          <button onclick="hideConnectModal()" class="text-3xl leading-none text-gray-400 hover:text-white">×</button>
        </div>
        <div class="space-y-3">
          <button onclick="connectWallet('metamask')" class="w-full flex items-center gap-4 p-5 rounded-2xl hover:bg-white/10 transition-all">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="42" alt="MetaMask">
            <div class="text-left">
              <div class="font-semibold text-lg">MetaMask</div>
              <div class="text-sm text-gray-400">Popular browser wallet</div>
            </div>
          </button>
          
          <button onclick="connectWallet('walletconnect')" class="w-full flex items-center gap-4 p-5 rounded-2xl hover:bg-white/10 transition-all">
            <img src="https://walletconnect.com/_next/static/media/walletconnect.2f8f1b5a.svg" width="42" alt="WalletConnect">
            <div class="text-left">
              <div class="font-semibold text-lg">WalletConnect</div>
              <div class="text-sm text-gray-400">Trust Wallet, OKX, Rainbow, Kepler...</div>
            </div>
          </button>
        </div>
      </div>
    </div>`;

  removeExistingModal();
  const div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function removeExistingModal() {
  const old = document.getElementById("connectModal");
  if (old) old.remove();
}

window.hideConnectModal = removeExistingModal;

window.connectWallet = async (type) => {
  hideConnectModal();
  
  if (type === "metamask") await connectMetaMask();
  else if (type === "walletconnect") await connectWalletConnect();
};

async function connectMetaMask() {
  if (!window.ethereum) return showToast("MetaMask not found!");

  try {
    provider = new BrowserProvider(window.ethereum);
    
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(ARC_CHAIN_ID)) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID_HEX }]
      });
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    signer = await provider.getSigner();

    onSuccessfulConnection();
  } catch (err) {
    console.error(err);
    showToast("Failed to connect MetaMask");
  }
};

async function connectWalletConnect() {
  try {
    if (!wcProvider) await initWalletConnect();
    await wcProvider.connect();
    await wcProvider.enable();

    provider = new BrowserProvider(wcProvider);
    const accounts = await provider.listAccounts();

    userAddress = accounts[0].address;
    signer = await provider.getSigner();

    onSuccessfulConnection();
  } catch (err) {
    console.error(err);
    showToast("WalletConnect failed or cancelled");
  }
};

function onSuccessfulConnection() {
  document.getElementById("logoContainer").classList.add("connected");
  updateConnectButton();
  showToast("Wallet connected successfully!");
  if (typeof updateBalance === "function") updateBalance();
}

function updateConnectButton() {
  const btn = document.getElementById("connectBtn");
  if (!btn || !userAddress) return;

  const shortAddr = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
  btn.innerHTML = `<i class="fas fa-wallet"></i> <span>${shortAddr}</span>`;
  btn.onclick = showAccountModal;
  btn.classList.add("!bg-emerald-500", "!text-white");
}

function showAccountModal() {
  const short = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
  const explorerLink = `https://testnet.arcscan.app/address/${userAddress}`;

  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[60]";
  modal.innerHTML = `
    <div class="glass border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 text-center">
      <div class="font-mono text-xl text-emerald-400 mb-4">${short}</div>
      <a href="${explorerLink}" target="_blank" class="text-sky-400 hover:underline block mb-6">View on Explorer →</a>
      <button onclick="copyAddress()" class="w-full py-4 rounded-2xl border border-white/20 hover:bg-white/10 mb-3">📋 Copy Address</button>
      <button onclick="disconnectWallet()" class="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">Disconnect Wallet</button>
    </div>`;
  
  document.body.appendChild(modal);
  modal.onclick = (e) => e.target === modal && modal.remove();
}

window.copyAddress = () => {
  navigator.clipboard.writeText(userAddress);
  showToast("Address copied!");
};

window.disconnectWallet = async () => {
  if (wcProvider) await wcProvider.disconnect().catch(() => {});

  signer = userAddress = provider = null;

  document.getElementById("logoContainer").classList.remove("connected");
  const btn = document.getElementById("connectBtn");
  btn.innerHTML = `<i class="fas fa-wallet"></i> <span>Connect Wallet</span>`;
  btn.onclick = showConnectModal;
  btn.classList.remove("!bg-emerald-500", "!text-white");

  showToast("Wallet disconnected");
};

// Global access
window.showConnectModal = showConnectModal;
