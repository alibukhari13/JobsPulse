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

  const { data, error } = await supabase
    .from('upwork_auth')
    .select('email')
    .eq('user_id', session.user.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const isConnected = !!data?.email;
  return NextResponse.json({
    isConnected,
    email: data?.email || null,
    connectedByMe: isConnected,
  });
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password } = await request.json();

    const { error } = await supabase
      .from('upwork_auth')
      .upsert(
        {
          user_id: session.user.userId,
          email,
          password,
          updated_at: new Date(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('upwork_auth')
    .delete()
    .eq('user_id', session.user.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}