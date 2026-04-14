import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data } = await supabase
      .from('settings')
      .select('expiry_minutes')
      .eq('user_id', session.user.userId)
      .eq('id', 1)
      .single();
    return NextResponse.json(data || { expiry_minutes: 360 });
  } catch {
    return NextResponse.json({ expiry_minutes: 360 });
  }
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { expiry_minutes } = await request.json();
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        expiry_minutes,
        user_id: session.user.userId,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}