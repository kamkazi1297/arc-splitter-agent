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

async function saveHistoryToCloud(userAddress, record) {
  try {
    const client = await getSupabase();
    if (!client || !userAddress) return;
    const { error } = await client
      .from('history')
      .insert([{
        user_address: userAddress.toLowerCase(),
        memo: record.memo || record.type || '',
        history_data: record
      }]);
    if (error) console.error('Error saving to cloud:', error);
  } catch (e) {
    console.error('saveHistoryToCloud', e);
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
      .order('id', { ascending: false });
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
