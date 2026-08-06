/**
 * ArcSplit Cloud DB helpers
 * - History API (all pages)
 * - Payment links / invoices
 * - Workspace (teams, members, permissions, invites, team activity)
 */

const SUPABASE_URL = 'https://yelauzpxsfjzydffhnhb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbGF1enB4c2ZqenlkZmZobmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjEyOTMsImV4cCI6MjEwMDkzNzI5M30.qtLEnhS8Zs34U_inur4e5UIBuKB5AmS_Z0VrT7jFvqM';

let supabaseClient = null;
let supabaseReady = null;

function loadSupabaseScript() {
  if (window.supabase) return Promise.resolve();
  if (supabaseReady) return supabaseReady;
  supabaseReady = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-supabase-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load supabase-js')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.setAttribute('data-supabase-js', '1');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load supabase-js'));
    document.head.appendChild(script);
  });
  return supabaseReady;
}

async function getSupabase() {
  await loadSupabaseScript();
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

/* ===================== HISTORY ===================== */

async function saveHistoryToCloud(userAddress, record) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return false;
    const r = { ...(record || {}) };
    // Auto-tag workspace from guard / URL so Team Activity can find it
    if (!r.workspaceId && !r.workspace_id) {
      try {
        const wid = (typeof window !== 'undefined' && window.ARC_WORKSPACE_ID)
          || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('workspace'))
          || null;
        if (wid) r.workspaceId = wid;
      } catch {}
    }
    if (!r.timestamp) r.timestamp = new Date().toISOString();
    if (!r.status) r.status = 'Success';
    const { error } = await client
      .from('history')
      .insert([{
        user_address: userAddress.toLowerCase(),
        memo: r.memo || r.type || r.appName || '',
        history_data: r
      }]);
    if (error) {
      console.error('Error saving to cloud:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('saveHistoryToCloud', e);
    return false;
  }
}

async function fetchHistoryFromCloud(userAddress) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return [];
    const addr = userAddress.toLowerCase();
    // Prefer exact match (addresses are stored lowercased by saveHistoryToCloud)
    let { data, error } = await client
      .from('history')
      .select('history_data, user_address, id, memo')
      .eq('user_address', addr)
      .order('id', { ascending: false })
      .limit(80);
    if (error) {
      console.warn('fetchHistory eq failed, fallback', error.message || error);
      const fb = await client
        .from('history')
        .select('history_data, user_address, id, memo')
        .order('id', { ascending: false })
        .limit(150);
      if (fb.error) {
        console.error('Error fetching history:', fb.error);
        return [];
      }
      data = (fb.data || []).filter(r =>
        String(r.user_address || '').toLowerCase() === addr
      );
      error = null;
    }
    return (data || []).map(row => {
      const h = (row.history_data && typeof row.history_data === 'object')
        ? { ...row.history_data }
        : {};
      if (!h.timestamp) h.timestamp = new Date().toISOString();
      if (!h.user && row.user_address) h.user = row.user_address;
      return h;
    }).filter(Boolean);
  } catch (e) {
    console.error('fetchHistoryFromCloud', e);
    return [];
  }
}

async function fetchTeamHistory(memberAddresses, workspaceId, limit = 60) {
  try {
    const client = await getSupabase();
    if (!client) return [];

    const addrs = new Set(
      (memberAddresses || []).map(a => String(a).toLowerCase()).filter(Boolean)
    );

    // Plain fetch — no PostgREST or/ilike/json filters (those were causing HTTP 400)
    const { data, error } = await client
      .from('history')
      .select('history_data, user_address, id, memo')
      .order('id', { ascending: false })
      .limit(250);

    if (error) {
      console.error('fetchTeamHistory', error);
      return [];
    }

    let rows = (data || []).map(row => {
      const h = (row.history_data && typeof row.history_data === 'object')
        ? row.history_data
        : {};
      return {
        ...h,
        user: h.user || row.user_address,
        user_address: row.user_address,
        timestamp: h.timestamp || null,
        _id: row.id
      };
    });

    // Keep only team members (case-insensitive)
    if (addrs.size) {
      rows = rows.filter(r =>
        addrs.has(String(r.user || r.user_address || '').toLowerCase())
      );
    }

    if (workspaceId) {
      const wid = String(workspaceId);
      const tagged = rows.filter(r =>
        String(r.workspaceId || r.workspace_id || '') === wid
      );
      if (tagged.length) return tagged.slice(0, limit);

      // Fallback: member rows not tagged to a different workspace
      rows = rows
        .filter(r => {
          const w = r.workspaceId || r.workspace_id;
          return !w || String(w) === wid;
        })
        .map(r => ({
          ...r,
          _untagged: !(r.workspaceId || r.workspace_id)
        }));
    }

    return rows.slice(0, limit);
  } catch (e) {
    console.error('fetchTeamHistory', e);
    return [];
  }
}


async function savePaymentRecord(userAddress, record) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return false;
    const row = {
      user_address: userAddress.toLowerCase(),
      link_id: record.linkId || record.link_id || record.id || null,
      type: record.type || 'link',
      title: record.title || record.memo || '',
      token: record.token || record.tokenSymbol || 'USDC',
      amount: Number(record.amount || 0),
      status: record.status || 'Active',
      tx_hash: record.txHash || record.hash || record.tx_hash || null,
      url: record.url || null,
      expiration: record.expiration || record.expiresAt || null,
      meta: record.meta || {}
    };
    const { error } = await client.from('payment_links').insert([row]);
    if (error) {
      console.error('Error saving payment record:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('savePaymentRecord', e);
    return false;
  }
}

async function fetchPaymentRecords(userAddress, opts = {}) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return [];
    let q = client
      .from('payment_links')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(opts.limit || 100);
    if (opts.status) q = q.eq('status', opts.status);
    if (opts.type) q = q.eq('type', opts.type);
    const { data, error } = await q;
    if (error) {
      console.error('Error fetching payment records:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('fetchPaymentRecords', e);
    return [];
  }
}

async function updatePaymentStatus(userAddress, linkId, status, extra = {}) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress || !linkId) return false;
    const patch = { status, ...extra };
    const { error } = await client
      .from('payment_links')
      .update(patch)
      .eq('user_address', userAddress.toLowerCase())
      .eq('link_id', linkId);
    if (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('updatePaymentStatus', e);
    return false;
  }
}

/* ===================== WORKSPACE ===================== */

const DEFAULT_MODULE_IDS = ['split', 'batch', 'roles', 'giveaway', 'vesting', 'pay', 'agentic', 'conditional'];

function defaultPermissions() {
  const allTrue = Object.fromEntries(DEFAULT_MODULE_IDS.map(id => [id, true]));
  const allFalse = Object.fromEntries(DEFAULT_MODULE_IDS.map(id => [id, false]));
  return {
    owner: { ...allTrue },
    admin: { ...allTrue },
    member: { ...allFalse },
    viewer: { ...allFalse }
  };
}

async function createWorkspace(ownerAddress, { name, description = '', treasuryAddress = null, defaultToken = null }) {
  try {
    const client = await getSupabase();
    if (!client || !ownerAddress || !name) return null;
    const addr = ownerAddress.toLowerCase();
    const settings = {
      permissions: defaultPermissions(),
      plan: 'free'
    };
    const { data: ws, error } = await client
      .from('workspaces')
      .insert([{
        name: name.trim(),
        description: description || '',
        owner_address: addr,
        treasury_address: treasuryAddress ? treasuryAddress.toLowerCase() : addr,
        default_token: defaultToken || '0x3600000000000000000000000000000000000000',
        settings
      }])
      .select()
      .single();
    if (error) {
      console.error('createWorkspace', error);
      return null;
    }
    const { error: mErr } = await client.from('workspace_members').insert([{
      workspace_id: ws.id,
      user_address: addr,
      role: 'owner',
      display_name: 'Owner',
      invited_by: addr
    }]);
    if (mErr) console.error('createWorkspace member', mErr);
    return ws;
  } catch (e) {
    console.error('createWorkspace', e);
    return null;
  }
}

async function fetchMyWorkspaces(userAddress) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return [];
    const addr = userAddress.toLowerCase();
    const { data: memberships, error } = await client
      .from('workspace_members')
      .select('role, display_name, workspace_id, workspaces(*)')
      .eq('user_address', addr);
    if (error) {
      console.error('fetchMyWorkspaces', error);
      return [];
    }
    return (memberships || []).map(m => ({
      ...m.workspaces,
      my_role: m.role,
      my_display_name: m.display_name
    })).filter(w => w && w.id);
  } catch (e) {
    console.error('fetchMyWorkspaces', e);
    return [];
  }
}

async function fetchWorkspace(workspaceId) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId) return null;
    const { data, error } = await client
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();
    if (error) {
      console.error('fetchWorkspace', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('fetchWorkspace', e);
    return null;
  }
}

async function fetchWorkspaceMembers(workspaceId) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId) return [];
    const { data, error } = await client
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });
    if (error) {
      console.error('fetchWorkspaceMembers', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('fetchWorkspaceMembers', e);
    return [];
  }
}

async function inviteWorkspaceMember(workspaceId, inviterAddress, memberAddress, role = 'member', displayName = '') {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId || !memberAddress) return false;
    const safeRole = ['admin', 'member', 'viewer'].includes(role) ? role : 'member';
    const addr = memberAddress.toLowerCase();
    const rank = { owner: 4, admin: 3, member: 2, viewer: 1 };

    const { data: existing } = await client
      .from('workspace_members')
      .select('role, display_name')
      .eq('workspace_id', workspaceId)
      .eq('user_address', addr)
      .maybeSingle();

    if (existing) {
      if (existing.role === 'owner') return false; // never change owner via invite
      const keep = (rank[existing.role] || 0) >= (rank[safeRole] || 0) ? existing.role : safeRole;
      if (keep === existing.role) return true; // already same or higher
      const { error } = await client.from('workspace_members').update({
        role: keep,
        display_name: displayName || existing.display_name || ''
      }).eq('workspace_id', workspaceId).eq('user_address', addr);
      return !error;
    }

    const { error } = await client.from('workspace_members').insert([{
      workspace_id: workspaceId,
      user_address: addr,
      role: safeRole,
      display_name: displayName || '',
      invited_by: (inviterAddress || '').toLowerCase()
    }]);
    if (error) {
      console.error('inviteWorkspaceMember', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('inviteWorkspaceMember', e);
    return false;
  }
}

async function removeWorkspaceMember(workspaceId, memberAddress) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId || !memberAddress) return false;
    const { error } = await client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_address', memberAddress.toLowerCase())
      .neq('role', 'owner');
    if (error) {
      console.error('removeWorkspaceMember', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('removeWorkspaceMember', e);
    return false;
  }
}

async function updateMemberRole(workspaceId, memberAddress, newRole) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId || !memberAddress) return false;
    if (!['admin', 'member', 'viewer'].includes(newRole)) return false;
    const { error } = await client
      .from('workspace_members')
      .update({ role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_address', memberAddress.toLowerCase())
      .neq('role', 'owner');
    if (error) {
      console.error('updateMemberRole', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('updateMemberRole', e);
    return false;
  }
}

async function updateWorkspace(workspaceId, patch) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId) return false;
    const allowed = {};
    if (patch.name !== undefined) allowed.name = String(patch.name).trim();
    if (patch.description !== undefined) allowed.description = String(patch.description);
    if (patch.treasury_address !== undefined) {
      allowed.treasury_address = patch.treasury_address ? patch.treasury_address.toLowerCase() : null;
    }
    if (patch.default_token !== undefined) allowed.default_token = patch.default_token;
    if (patch.settings !== undefined) allowed.settings = patch.settings;
    allowed.updated_at = new Date().toISOString();
    const { error } = await client
      .from('workspaces')
      .update(allowed)
      .eq('id', workspaceId);
    if (error) {
      console.error('updateWorkspace', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('updateWorkspace', e);
    return false;
  }
}

async function leaveWorkspace(workspaceId, userAddress) {
  return removeWorkspaceMember(workspaceId, userAddress);
}

async function checkWorkspaceAccess(workspaceId, userAddress, moduleId) {
  const result = { ok: false, role: null, reason: '', workspace: null, permissions: null };
  try {
    if (!workspaceId || !userAddress) {
      result.reason = 'missing_params';
      return result;
    }
    const addr = userAddress.toLowerCase();
    const [ws, members] = await Promise.all([
      fetchWorkspace(workspaceId),
      fetchWorkspaceMembers(workspaceId)
    ]);
    if (!ws) {
      result.reason = 'workspace_not_found';
      return result;
    }
    result.workspace = ws;
    const me = (members || []).find(m => m.user_address === addr);
    if (!me) {
      result.reason = 'not_a_member';
      return result;
    }
    result.role = me.role;
    const settings = typeof ws.settings === 'string' ? JSON.parse(ws.settings || '{}') : (ws.settings || {});
    const perms = settings.permissions || defaultPermissions();
    result.permissions = perms;
    if (me.role === 'owner') {
      result.ok = true;
      return result;
    }
    if (!moduleId) {
      result.ok = true;
      return result;
    }
    if (me.role === 'viewer') {
      result.ok = false;
      result.reason = 'viewer_readonly';
      return result;
    }
    const rolePerms = perms[me.role] || {};
    if (rolePerms[moduleId]) {
      result.ok = true;
      return result;
    }
    result.reason = 'no_module_permission';
    return result;
  } catch (e) {
    console.error('checkWorkspaceAccess', e);
    result.reason = 'error';
    return result;
  }
}

function getWorkspaceIdFromURL() {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('workspace') || q.get('ws') || null;
  } catch {
    return null;
  }
}

/* ===================== WORKSPACE INVITES ===================== */

function randomInviteToken() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

async function createWorkspaceInvite(workspaceId, createdBy, role = 'member', expiresInDays = 7) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId || !createdBy) return null;
    const token = randomInviteToken();
    const expires_at = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    const safeRole = ['admin', 'member', 'viewer'].includes(role) ? role : 'member';
    const { data, error } = await client.from('workspace_invites').insert([{
      workspace_id: workspaceId,
      token,
      role: safeRole,
      created_by: createdBy.toLowerCase(),
      expires_at
    }]).select().single();
    if (error) {
      console.error('createWorkspaceInvite', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('createWorkspaceInvite', e);
    return null;
  }
}

async function fetchInviteByToken(token) {
  try {
    const client = await getSupabase();
    if (!client || !token) return null;
    const { data, error } = await client
      .from('workspace_invites')
      .select('*, workspaces(*)')
      .eq('token', token)
      .is('used_at', null)
      .maybeSingle();
    if (error) {
      console.error('fetchInviteByToken', error);
      return null;
    }
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { ...data, expired: true };
    }
    return data;
  } catch (e) {
    console.error('fetchInviteByToken', e);
    return null;
  }
}

async function acceptWorkspaceInvite(token, userAddress, displayName = '') {
  try {
    const client = await getSupabase();
    if (!client || !token || !userAddress) return { ok: false, reason: 'missing' };
    const inv = await fetchInviteByToken(token);
    if (!inv) return { ok: false, reason: 'not_found' };
    if (inv.expired) return { ok: false, reason: 'expired' };
    if (inv.used_at) return { ok: false, reason: 'already_used' };

    const addr = userAddress.toLowerCase();
    const inviteRole = inv.role === 'admin' ? 'admin' : inv.role === 'viewer' ? 'viewer' : 'member';
    const rank = { owner: 4, admin: 3, member: 2, viewer: 1 };

    // If already a member, never downgrade (and never touch owner)
    const { data: existing } = await client
      .from('workspace_members')
      .select('role, display_name')
      .eq('workspace_id', inv.workspace_id)
      .eq('user_address', addr)
      .maybeSingle();

    if (existing) {
      // Already in workspace — keep current role; do not consume invite for self-test if owner
      if (existing.role === 'owner') {
        return {
          ok: false,
          reason: 'already_owner',
          workspace_id: inv.workspace_id,
          role: 'owner',
          workspace: inv.workspaces
        };
      }
      const keepRole = (rank[existing.role] || 0) >= (rank[inviteRole] || 0)
        ? existing.role
        : inviteRole;

      // Only update if upgrading; otherwise leave as-is
      if (keepRole !== existing.role) {
        await client.from('workspace_members').update({
          role: keepRole,
          display_name: displayName || existing.display_name || ''
        }).eq('workspace_id', inv.workspace_id).eq('user_address', addr);
      }

      // Mark invite used only when a real join/upgrade happens for non-owner
      await client.from('workspace_invites').update({
        used_at: new Date().toISOString(),
        used_by: addr
      }).eq('id', inv.id);

      return {
        ok: true,
        workspace_id: inv.workspace_id,
        role: keepRole,
        already_member: true,
        workspace: inv.workspaces
      };
    }

    // New member
    const { error: mErr } = await client.from('workspace_members').insert([{
      workspace_id: inv.workspace_id,
      user_address: addr,
      role: inviteRole,
      display_name: displayName || '',
      invited_by: inv.created_by
    }]);
    if (mErr) {
      console.error('accept member', mErr);
      return { ok: false, reason: 'member_failed' };
    }

    await client.from('workspace_invites').update({
      used_at: new Date().toISOString(),
      used_by: addr
    }).eq('id', inv.id);

    return {
      ok: true,
      workspace_id: inv.workspace_id,
      role: inviteRole,
      workspace: inv.workspaces
    };
  } catch (e) {
    console.error('acceptWorkspaceInvite', e);
    return { ok: false, reason: 'error' };
  }
}

async function listWorkspaceInvites(workspaceId) {
  try {
    const client = await getSupabase();
    if (!client || !workspaceId) return [];
    const { data, error } = await client
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('used_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('listWorkspaceInvites', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('listWorkspaceInvites', e);
    return [];
  }
}

async function revokeWorkspaceInvite(inviteId) {
  try {
    const client = await getSupabase();
    if (!client || !inviteId) return false;
    const { error } = await client
      .from('workspace_invites')
      .delete()
      .eq('id', inviteId)
      .is('used_at', null);
    if (error) {
      console.error('revokeWorkspaceInvite', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('revokeWorkspaceInvite', e);
    return false;
  }
}

/* Expose on window */
if (typeof window !== 'undefined') {
  window.getSupabase = getSupabase;
  window.saveHistoryToCloud = saveHistoryToCloud;
  window.fetchHistoryFromCloud = fetchHistoryFromCloud;
  window.fetchTeamHistory = fetchTeamHistory;
  window.savePaymentRecord = savePaymentRecord;
  window.fetchPaymentRecords = fetchPaymentRecords;
  window.updatePaymentStatus = updatePaymentStatus;
  window.createWorkspace = createWorkspace;
  window.fetchMyWorkspaces = fetchMyWorkspaces;
  window.fetchWorkspace = fetchWorkspace;
  window.fetchWorkspaceMembers = fetchWorkspaceMembers;
  window.inviteWorkspaceMember = inviteWorkspaceMember;
  window.removeWorkspaceMember = removeWorkspaceMember;
  window.updateMemberRole = updateMemberRole;
  window.updateWorkspace = updateWorkspace;
  window.leaveWorkspace = leaveWorkspace;
  window.checkWorkspaceAccess = checkWorkspaceAccess;
  window.getWorkspaceIdFromURL = getWorkspaceIdFromURL;
  window.defaultPermissions = defaultPermissions;
  window.ARC_DEFAULT_MODULE_IDS = DEFAULT_MODULE_IDS;
  window.createWorkspaceInvite = createWorkspaceInvite;
  window.fetchInviteByToken = fetchInviteByToken;
  window.acceptWorkspaceInvite = acceptWorkspaceInvite;
  window.listWorkspaceInvites = listWorkspaceInvites;
  window.revokeWorkspaceInvite = revokeWorkspaceInvite;
}
