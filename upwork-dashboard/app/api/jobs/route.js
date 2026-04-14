import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '../../../lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf";
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('expiry_minutes')
      .eq('user_id', session.user.userId)
      .eq('id', 1)
      .single();

    if (settings && settings.expiry_minutes > 0) {
      const expiryMins = settings.expiry_minutes;
      const cutoffTime = new Date(Date.now() - expiryMins * 60 * 1000).toISOString();
      await supabase
        .from('jobs')
        .delete()
        .eq('user_id', session.user.userId)
        .lt('created_at', cutoffTime);
    }

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', session.user.userId)
      .order('id', { ascending: false });

    if (error) throw error;
    return NextResponse.json(jobs, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await supabase
      .from('jobs')
      .delete()
      .eq('job_id', id)
      .eq('user_id', session.user.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}