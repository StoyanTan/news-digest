import { createClient } from '@supabase/supabase-js';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  return createClient(url, key);
}

export async function subscribe(email: string, topics: string[]): Promise<void> {
  const { error } = await client()
    .from('subscribers')
    .upsert({ email, topics, active: true }, { onConflict: 'email' });
  if (error) throw new Error(error.message);
}

export async function unsubscribe(email: string): Promise<void> {
  const { error } = await client()
    .from('subscribers')
    .update({ active: false })
    .eq('email', email);
  if (error) throw new Error(error.message);
}

export async function listActive(): Promise<{ email: string; topics: string[] }[]> {
  const { data, error } = await client()
    .from('subscribers')
    .select('email, topics')
    .eq('active', true);
  if (error) throw new Error(error.message);
  return (data ?? []) as { email: string; topics: string[] }[];
}
