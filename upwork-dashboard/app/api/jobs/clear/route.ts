import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE() {
  const session = await getIronSession<{ user: SessionData }>(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete all jobs for this user
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('user_id', session.user.userId);

    if (deleteError) throw deleteError;

    // Set force_scrape flag to true (new table structure – only user_id)
    const { error: updateError } = await supabase
      .from('settings')
      .update({ force_scrape: true, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'All jobs cleared. Scraping started...' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}