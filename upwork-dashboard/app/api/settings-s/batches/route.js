import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('settings')
    .select('batch_limit')
    .eq('user_id', session.user.userId)
    .maybeSingle();

  return NextResponse.json(data || { batch_limit: 3 });
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { batch_limit } = await request.json();
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        user_id: session.user.userId,
        batch_limit,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}