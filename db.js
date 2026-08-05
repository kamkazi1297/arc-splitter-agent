/**
 * ArcSplit Cloud DB helpers
 * - History API (all pages)
 * - Payment links / invoices
 * - Workspace (teams, members, treasury)
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
    const { error } = await client
      .from('history')
      .insert([{
        user_address: userAddress.toLowerCase(),
        memo: record.memo || record.type || '',
        history_data: record
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
    const { data, error } = await client
      .from('history')
      .select('history_data')
      .eq('user_address', userAddress.toLowerCase())
      .order('id', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }
    return (data || []).map(row => row.history_data).filter(Boolean);
  } catch (e) {
    console.error('fetchHistoryFromCloud', e);
    return [];
  }
}

/* ===================== PAYMENT LINKS / INVOICES ===================== */

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

async function createWorkspace(ownerAddress, { name, description = '', treasuryAddress = null, defaultToken = null }) {
  try {
    const client = await getSupabase();
    if (!client || !ownerAddress || !name) return null;
    const addr = ownerAddress.toLowerCase();
    const { data: ws, error } = await client
      .from('workspaces')
      .insert([{
        name: name.trim(),
        description: description || '',
        owner_address: addr,
        treasury_address: treasuryAddress ? treasuryAddress.toLowerCase() : addr,
        default_token: defaultToken || '0x3600000000000000000000000000000000000000'
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
    const { error } = await client.from('workspace_members').upsert([{
      workspace_id: workspaceId,
      user_address: memberAddress.toLowerCase(),
      role: role === 'admin' ? 'admin' : 'member',
      display_name: displayName || '',
      invited_by: (inviterAddress || '').toLowerCase()
    }], { onConflict: 'workspace_id,user_address' });
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
    if (!['admin', 'member'].includes(newRole)) return false;
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

/* Expose on window */
if (typeof window !== 'undefined') {
  window.getSupabase = getSupabase;
  window.saveHistoryToCloud = saveHistoryToCloud;
  window.fetchHistoryFromCloud = fetchHistoryFromCloud;
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
}
