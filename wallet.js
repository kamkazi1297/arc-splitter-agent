// js/wallet.js
import { BrowserProvider } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

let signer = null;
let userAddress = null;
let provider = null;
let wcProvider = null;

const PROJECT_ID = "1c0e752ab2d259f09fd2eeae3784448c";
const ARC_CHAIN_ID = 5042002;

async function initWalletConnect() {
  wcProvider = await EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [ARC_CHAIN_ID],
    showQrModal: true,
  });
}

export async function showConnectModal() {
  let html = `
    <div id="connectModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="glass border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold">Connect Wallet</h3>
          <button onclick="hideConnectModal()" class="text-3xl leading-none text-gray-400 hover:text-white">×</button>
        </div>
        <div class="space-y-3">
          <button onclick="connectWallet('metamask')" 
                  class="w-full flex items-center gap-4 p-5 rounded-2xl hover:bg-white/10 transition-all">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="42">
            <div class="text-left">
              <div class="font-semibold text-lg">MetaMask</div>
              <div class="text-sm text-gray-400">Browser Wallet</div>
            </div>
          </button>

          <button onclick="connectWallet('walletconnect')" 
                  class="w-full flex items-center gap-4 p-5 rounded-2xl hover:bg-white/10 transition-all">
            <img src="https://walletconnect.com/_next/static/media/walletconnect.2f8f1b5a.svg" width="42">
            <div class="text-left">
              <div class="font-semibold text-lg">WalletConnect</div>
              <div class="text-sm text-gray-400">Trust • OKX • Rainbow • Kepler ...</div>
            </div>
          </button>
        </div>
      </div>
    </div>`;

  // حذف modal قبلی اگر وجود داشت
  const old = document.getElementById("connectModal");
  if (old) old.remove();

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container.firstElementChild);
}

window.hideConnectModal = () => {
  const modal = document.getElementById("connectModal");
  if (modal) modal.remove();
};

window.connectWallet = async (type) => {
  hideConnectModal();

  if (type === "metamask") {
    await connectMetaMask();
  } else if (type === "walletconnect") {
    await connectWalletConnect();
  }
};

async function connectMetaMask() {
  if (!window.ethereum) return showToast("MetaMask not found!");

  try {
    provider = new BrowserProvider(window.ethereum);
    
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(ARC_CHAIN_ID)) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: "0x4CF0A2" }]
        });
      } catch (e) {
        showToast("Please switch to Arc Testnet", 4000);
        return;
      }
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    signer = await provider.getSigner();

    document.getElementById("logoContainer").classList.add("connected");
    updateConnectButton();
    showToast("Wallet connected successfully");
    if (typeof updateBalance === "function") await updateBalance();
  } catch (e) {
    console.error(e);
    showToast("Connection failed");
  }
}

async function connectWalletConnect() {
  try {
    if (!wcProvider) await initWalletConnect();
    
    await wcProvider.connect();
    await wcProvider.enable();

    provider = new BrowserProvider(wcProvider);
    const accounts = await provider.listAccounts();

    userAddress = accounts[0].address;
    signer = await provider.getSigner();

    document.getElementById("logoContainer").classList.add("connected");
    updateConnectButton();
    showToast("Wallet connected successfully");
    if (typeof updateBalance === "function") await updateBalance();
  } catch (e) {
    console.error(e);
    showToast("WalletConnect cancelled or failed");
  }
}

function updateConnectButton() {
  const btn = document.getElementById("connectBtn");
  if (!userAddress) return;

  const short = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
  btn.innerHTML = `<i class="fas fa-wallet"></i> <span>${short}</span>`;
  btn.onclick = showAccountModal;
  btn.classList.add("!bg-emerald-500", "!text-white");
}

function showAccountModal() {
  const short = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
  const link = `https://testnet.arcscan.app/address/${userAddress}`;

  const modalHTML = `
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
      <div class="glass border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 text-center">
        <div class="font-mono text-xl mb-4 text-emerald-400">${short}</div>
        <a href="${link}" target="_blank" class="text-sky-400 hover:underline block mb-6">View on Explorer →</a>
        
        <button onclick="copyAddress()" class="w-full py-4 rounded-2xl border border-white/20 hover:bg-white/10 mb-3">📋 Copy Address</button>
        <button onclick="disconnectWallet()" class="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">Disconnect Wallet</button>
      </div>
    </div>`;

  const div = document.createElement("div");
  div.innerHTML = modalHTML;
  document.body.appendChild(div.firstElementChild);

  div.firstElementChild.onclick = (e) => {
    if (e.target === div.firstElementChild) div.firstElementChild.remove();
  };
}

window.copyAddress = () => {
  navigator.clipboard.writeText(userAddress);
  showToast("Address copied to clipboard");
};

window.disconnectWallet = async () => {
  if (wcProvider) await wcProvider.disconnect().catch(() => {});

  signer = null;
  userAddress = null;
  provider = null;

  document.getElementById("logoContainer").classList.remove("connected");
  const btn = document.getElementById("connectBtn");
  btn.innerHTML = `<i class="fas fa-wallet"></i> <span>Connect Wallet</span>`;
  btn.onclick = showConnectModal;
  btn.classList.remove("!bg-emerald-500", "!text-white");

  showToast("Wallet disconnected");
};

// Make showConnectModal globally available
window.showConnectModal = showConnectModal;
