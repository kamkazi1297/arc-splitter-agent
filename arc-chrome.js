/**
 * ArcSplit shared chrome — Hub link, glass Connect, favicon, toast polish.
 * Include after the page header markup. Optional: <body data-arc-accent="emerald">
 */
(function () {
  const ACCENTS = {
    emerald: "arc-accent-emerald",
    cyan: "arc-accent-cyan",
    rose: "arc-accent-rose",
    amber: "arc-accent-amber",
    lime: "arc-accent-lime",
    yellow: "arc-accent-yellow",
    blue: "arc-accent-blue",
    sky: "arc-accent-sky",
    indigo: "arc-accent-indigo",
    violet: "arc-accent-violet",
    orange: "arc-accent-orange"
  };

  function detectAccent() {
    const fromBody = document.body && document.body.getAttribute("data-arc-accent");
    if (fromBody && ACCENTS[fromBody]) return ACCENTS[fromBody];
    const path = (location.pathname || "").toLowerCase();
    if (path.includes("batch")) return ACCENTS.rose;
    if (path.includes("role")) return ACCENTS.cyan;
    if (path.includes("giveaway")) return ACCENTS.orange;
    if (path.includes("vest")) return ACCENTS.lime;
    if (path.includes("pay") || path.includes("invoice")) return ACCENTS.yellow;
    if (path.includes("conditional") || path.includes("smart")) return ACCENTS.blue;
    if (path.includes("agentic")) return ACCENTS.sky;
    if (path.includes("workspace")) return ACCENTS.indigo;
    if (path.includes("analytic")) return ACCENTS.cyan;
    if (path.endsWith("/") || path.includes("index")) return ACCENTS.cyan;
    return ACCENTS.emerald;
  }

  function ensureFavicon() {
    if (document.querySelector('link[rel="icon"]')) return;
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "logo-white.svg";
    document.head.appendChild(link);
  }

  function ensureTitle() {
    try {
      const t = (document.title || "").trim();
      if (!t) {
        document.title = "ArcSplit";
        return;
      }
      if (!/^ArcSplit/i.test(t) && !/^Arc\s/i.test(t)) {
        document.title = "ArcSplit · " + t;
      }
    } catch {}
  }

  function ensureSharedCss() {
    if (document.querySelector('link[data-arc-shared]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "arc-shared.css";
    l.setAttribute("data-arc-shared", "1");
    document.head.appendChild(l);
  }

  function findHeaderActions() {
    // Prefer known button clusters near theme / connect
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn && themeBtn.parentElement) return themeBtn.parentElement;
    const connect =
      document.getElementById("connectBtn") ||
      document.getElementById("connectHeaderBtn");
    if (connect && connect.parentElement) return connect.parentElement;
    return null;
  }

  function workspaceQuery() {
    try {
      const p = new URLSearchParams(location.search);
      const ws = p.get("workspace") || p.get("ws");
      return ws ? ("?workspace=" + encodeURIComponent(ws)) : "";
    } catch {
      return "";
    }
  }

  function ensureHubLink() {
    if (document.getElementById("arcHubLink")) return;
    // Skip on hub itself
    const path = (location.pathname || "").toLowerCase();
    if (path.endsWith("/") || /index\.html?$/i.test(path)) return;

    const actions = findHeaderActions();
    if (!actions) return;

    const a = document.createElement("a");
    a.id = "arcHubLink";
    a.href = "index.html" + workspaceQuery();
    a.className = "arc-hub-link arc-hdr-btn";
    a.innerHTML = '<i class="fas fa-home"></i><span class="arc-hub-text">Hub</span>';
    a.title = "Back to Hub";

    // Insert before theme button if possible
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn && themeBtn.parentElement === actions) {
      actions.insertBefore(a, themeBtn);
    } else {
      actions.insertBefore(a, actions.firstChild);
    }
  }

  function styleConnectButtons(accentClass) {
    const ids = ["connectBtn", "connectHeaderBtn", "connectWalletBtn"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add("arc-btn-connect", "arc-btn-glass", "arc-hdr-btn", accentClass);
      // Remove solid white backgrounds that fight glass look
      el.classList.remove("bg-white", "text-gray-950", "text-black");
    });
    // Theme buttons → icon glass
    const theme = document.getElementById("themeBtn");
    if (theme) {
      theme.classList.add("arc-btn-icon");
    }
    const disc =
      document.getElementById("disconnectBtn") ||
      document.getElementById("disconnectWalletBtn");
    if (disc) {
      disc.classList.add("arc-btn-icon");
    }
  }

  function polishToast() {
    const t = document.getElementById("toast");
    if (t) t.classList.add("arc-toast");
  }

  /** Call from pages: window.arcSetConnectLoading(true/false) */
  window.arcSetConnectLoading = function (loading) {
    const btn =
      document.getElementById("connectBtn") ||
      document.getElementById("connectHeaderBtn") ||
      document.getElementById("connectWalletBtn");
    if (!btn) return;
    if (loading) {
      btn.dataset.arcPrev = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fas fa-circle-notch arc-spin"></i> <span>Connecting…</span>';
    } else {
      btn.disabled = false;
      if (btn.dataset.arcPrev) {
        btn.innerHTML = btn.dataset.arcPrev;
        delete btn.dataset.arcPrev;
      }
    }
  };

  function wrapConnectHandlers() {
    // Soft enhancement: if page calls eth_requestAccounts, show loading — best-effort
    if (!window.ethereum || window.__arcChromeEthWrapped) return;
    window.__arcChromeEthWrapped = true;
    const original = window.ethereum.request.bind(window.ethereum);
    window.ethereum.request = async function (args) {
      const method = args && args.method;
      const isConnect =
        method === "eth_requestAccounts" || method === "wallet_requestPermissions";
      if (isConnect) window.arcSetConnectLoading(true);
      try {
        return await original(args);
      } finally {
        if (isConnect) {
          setTimeout(() => window.arcSetConnectLoading(false), 400);
        }
      }
    };
  }

  function emptyStateUpgrade() {
    // Add class to common empty history placeholders if they exist as plain text nodes — skip heavy DOM walks
    document.querySelectorAll("[id*='history'], [id*='History'], [id*='activity']").forEach((box) => {
      if (!box || box.children.length !== 1) return;
      const child = box.children[0];
      if (
        child &&
        (child.tagName === "P" || child.tagName === "DIV") &&
        /no (transactions|history|activity|batch|vesting|giveaway|links|invoices)/i.test(
          child.textContent || ""
        )
      ) {
        child.classList.add("arc-empty");
      }
    });
  }

  
  function polishActionButtons() {
    const sels = [
      'button.app-button',
      'button[onclick*="addRecipient"]',
      'button[onclick*="AddToken"]',
      'button[onclick*="openCustom"]',
      'button[onclick*="importCSV"]',
      'button[onclick*="openSaveTemplate"]',
      'button[onclick*="openLoadTemplate"]',
      'button[onclick*="Distribute"]',
      'button[onclick*="distribute"]',
      'button[onclick*="Refresh"]',
      'button[onclick*="refresh"]',
      'button[onclick*="export"]',
      'button[onclick*="import"]',
      'button[onclick*="clearAll"]',
      'button[onclick*="showExtract"]'
    ];
    document.querySelectorAll(sels.join(',')).forEach((el) => {
      if (el.id === 'connectBtn' || el.id === 'connectHeaderBtn' || el.id === 'connectWalletBtn') return;
      el.classList.add('arc-btn-glass');
    });
  }

  function boot() {
    ensureSharedCss();
    ensureFavicon();
    ensureTitle();
    const accent = detectAccent();
    if (document.body) document.body.classList.add(accent);
    ensureHubLink();
    styleConnectButtons(accent);
    polishToast();
    wrapConnectHandlers();
    emptyStateUpgrade();
    polishActionButtons();
    // Re-apply after late UI updates (wallet connect rewrites)
    setTimeout(() => { styleConnectButtons(accent); polishActionButtons(); }, 800);
    setTimeout(() => emptyStateUpgrade(), 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
