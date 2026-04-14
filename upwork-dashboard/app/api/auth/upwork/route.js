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

  // ✅ Use maybeSingle() to avoid error when table is empty
  const { data } = await supabase
    .from('upwork_auth')
    .select('email, user_id')
    .eq('id', 1)
    .maybeSingle();

  const isConnected = !!data?.email;
  const connectedByMe = data?.user_id === session.user.userId;
  return NextResponse.json({
    isConnected,
    email: data?.email || null,
    connectedByMe,
  });
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password } = await request.json();

    const { data: existing } = await supabase
      .from('upwork_auth')
      .select('user_id')
      .eq('id', 1)
      .maybeSingle(); // ✅ Safer than .single()

    if (existing?.user_id && existing.user_id !== session.user.userId) {
      return NextResponse.json(
        { error: 'Another user already connected Upwork. They must disconnect first.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('upwork_auth')
      .upsert({
        id: 1,
        email,
        password,
        user_id: session.user.userId,
        updated_at: new Date(),
      })
      .select();

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

  const { data: existing } = await supabase
    .from('upwork_auth')
    .select('user_id')
    .eq('id', 1)
    .maybeSingle(); // ✅

  if (!existing || existing.user_id !== session.user.userId) {
    return NextResponse.json(
      { error: 'You cannot disconnect another user’s Upwork account' },
      { status: 403 }
    );
  }

  // ✅ DELETE the row instead of setting NULL (fixes NOT NULL constraint)
  const { error } = await supabase
    .from('upwork_auth')
    .delete()
    .eq('id', 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}