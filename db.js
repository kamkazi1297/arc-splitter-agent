/**
 * ArcSplit Cloud DB helpers
 * - Existing history API unchanged (safe for all current pages)
 * - Optional payment_links table helpers (run supabase_setup.sql first)
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

/* ===================== HISTORY (unchanged – used by all pages) ===================== */

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

/* ===================== PAYMENT LINKS / INVOICES (optional new table) ===================== */

/**
 * Save a payment link or invoice row.
 * record fields: linkId, type, title, token, amount, status, txHash, url, expiration, meta
 */
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

/**
 * Fetch payment links / invoices for a user.
 * opts: { status, type, limit }
 */
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

/**
 * Update status of a payment link / invoice by link_id (and user).
 */
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

/* Expose on window for non-module pages */
if (typeof window !== 'undefined') {
  window.getSupabase = getSupabase;
  window.saveHistoryToCloud = saveHistoryToCloud;
  window.fetchHistoryFromCloud = fetchHistoryFromCloud;
  window.savePaymentRecord = savePaymentRecord;
  window.fetchPaymentRecords = fetchPaymentRecords;
  window.updatePaymentStatus = updatePaymentStatus;
}
