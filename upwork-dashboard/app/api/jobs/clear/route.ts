import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SessionData {
  user?: {
    userId: string;
  };
}

export async function DELETE() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  // Runtime check
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.userId;

    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from('settings')
      .update({ force_scrape: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'All jobs cleared. Scraping started...' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}