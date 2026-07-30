const SUPABASE_URL = 'https://yelauzpxsfjzydffhnhb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbGF1enB4c2ZqenlkZmZobmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjEyOTMsImV4cCI6MjEwMDkzNzI5M30.qtLEnhS8Zs34U_inur4e5UIBuKB5AmS_Z0VrT7jFvqM';

if (!window.supabase) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  document.head.appendChild(script);
}

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

async function saveHistoryToCloud(userAddress, record) {
  const client = getSupabase();
  if (!client || !userAddress) return;
  const { error } = await client
    .from('history')
    .insert([{ user_address: userAddress.toLowerCase(), memo: record.memo, history_data: record }]);
  if (error) console.error("Error saving to cloud:", error);
}

async function fetchHistoryFromCloud(userAddress) {
  const client = getSupabase();
  if (!client || !userAddress) return [];
  const { data, error } = await client
    .from('history')
    .select('history_data')
    .eq('user_address', userAddress.toLowerCase())
    .order('id', { ascending: false });
  if (error) return [];
  return data.map(row => row.history_data);
}
