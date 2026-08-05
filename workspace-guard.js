/**
 * ArcSplit Workspace Guard (Phase B)
 * Include on every main module page AFTER db.js:
 *
 *   <script src="db.js"></script>
 *   <script>window.ARC_MODULE_ID = "split";</script>  // batch | roles | giveaway | vesting | pay | agentic | conditional
 *   <script src="workspace-guard.js"></script>
 *
 * Behavior:
 * - If URL has ?workspace=ID → check membership + module permission after wallet is known
 * - If not a member or no permission → show blocking banner
 * - Wraps saveHistoryToCloud to auto-attach workspaceId when present
 * - Does NOT block the page when there is no ?workspace= (normal solo use)
 */

(function () {
  const MODULE_ID = window.ARC_MODULE_ID || null;
  let workspaceId = null;
  let accessCache = null;
  let bannerEl = null;

  function ensureBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = document.createElement('div');
    bannerEl.id = 'arcWsGuardBanner';
    bannerEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99999',
      'padding:12px 16px', 'font-family:system-ui,sans-serif', 'font-size:14px',
      'font-weight:600', 'text-align:center', 'display:none'
    ].join(';');
    document.body.appendChild(bannerEl);
    return bannerEl;
  }

  function showBanner(kind, text) {
    const el = ensureBanner();
    el.style.display = 'block';
    if (kind === 'ok') {
      el.style.background = 'rgba(16,185,129,0.95)';
      el.style.color = '#fff';
    } else if (kind === 'warn') {
      el.style.background = 'rgba(245,158,11,0.95)';
      el.style.color = '#111';
    } else {
      el.style.background = 'rgba(244,63,94,0.95)';
      el.style.color = '#fff';
    }
    el.innerHTML = text;
  }

  function hideBanner() {
    if (bannerEl) bannerEl.style.display = 'none';
  }

  function getConnectedAddress() {
    return (
      window.userAddress ||
      window.currentAccount ||
      window.account ||
      window.walletAddress ||
      null
    );
  }

  async function runCheck(address) {
    if (!workspaceId) {
      hideBanner();
      accessCache = { ok: true, solo: true };
      return accessCache;
    }
    if (!address) {
      showBanner('warn', 'Workspace mode — connect the wallet that is a member of this team.');
      accessCache = { ok: false, reason: 'no_wallet' };
      return accessCache;
    }
    if (typeof checkWorkspaceAccess !== 'function') {
      showBanner('warn', 'Workspace guard: db.js not loaded');
      return { ok: false, reason: 'no_db' };
    }
    const res = await checkWorkspaceAccess(workspaceId, address, MODULE_ID);
    accessCache = res;
    if (res.ok) {
      const name = res.workspace?.name || 'Workspace';
      showBanner(
        'ok',
        `Team: <b>${escapeHtml(name)}</b> · Role: <b>${escapeHtml(res.role || '')}</b> · Paying from YOUR wallet` +
          (MODULE_ID ? ` · Module: ${escapeHtml(MODULE_ID)}` : '')
      );
      setTimeout(hideBanner, 5000);
    } else if (res.reason === 'not_a_member') {
      showBanner('err', 'You are not a member of this workspace. Ask the owner to invite your wallet.');
    } else if (res.reason === 'no_module_permission') {
      showBanner(
        'err',
        `No permission for module "${escapeHtml(MODULE_ID || '')}" in this workspace. Ask Owner/Admin.`
      );
    } else if (res.reason === 'workspace_not_found') {
      showBanner('err', 'Workspace not found.');
    } else {
      showBanner('err', 'Workspace access denied.');
    }
    return res;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Call before sending a team-related tx if you want hard block */
  async function requireWorkspaceAccess(address) {
    const res = await runCheck(address || getConnectedAddress());
    if (!workspaceId) return true;
    return !!res.ok;
  }

  // Patch saveHistoryToCloud so team activity gets workspaceId
  function patchHistorySaver() {
    const orig = window.saveHistoryToCloud;
    if (typeof orig !== 'function' || orig.__wsPatched) return;
    async function wrapped(userAddress, record) {
      const r = { ...(record || {}) };
      if (workspaceId && !r.workspaceId) r.workspaceId = workspaceId;
      return orig(userAddress, r);
    }
    wrapped.__wsPatched = true;
    window.saveHistoryToCloud = wrapped;
  }

  function init() {
    try {
      workspaceId = typeof getWorkspaceIdFromURL === 'function'
        ? getWorkspaceIdFromURL()
        : (new URLSearchParams(location.search).get('workspace') || null);
    } catch {
      workspaceId = null;
    }
    window.ARC_WORKSPACE_ID = workspaceId;
    patchHistorySaver();

    if (!workspaceId) return;

    // Initial check (wallet may connect later)
    runCheck(getConnectedAddress());

    // Re-check when common wallet globals change
    let last = getConnectedAddress();
    setInterval(() => {
      const now = getConnectedAddress();
      if (now && now !== last) {
        last = now;
        runCheck(now);
      }
    }, 1500);

    // ethereum account change
    if (window.ethereum && window.ethereum.on) {
      try {
        window.ethereum.on('accountsChanged', (accs) => {
          const a = accs && accs[0] ? accs[0] : null;
          if (a) window.userAddress = a;
          runCheck(a);
        });
      } catch {}
    }
  }

  window.requireWorkspaceAccess = requireWorkspaceAccess;
  window.refreshWorkspaceGuard = () => runCheck(getConnectedAddress());
  window.getArcWorkspaceId = () => workspaceId;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
