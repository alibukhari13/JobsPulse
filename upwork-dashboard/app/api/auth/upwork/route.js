import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
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

    // 1. Check if current user already has a connection (it's fine, we'll update)
    const { data: existingForUser } = await supabase
      .from('upwork_auth')
      .select('id')
      .eq('user_id', session.user.userId)
      .maybeSingle();

    // 2. Check if this email is used by a DIFFERENT user
    const { data: existingByEmail } = await supabase
      .from('upwork_auth')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingByEmail && existingByEmail.user_id !== session.user.userId) {
      return NextResponse.json(
        { error: 'This Upwork account is already connected to another dashboard user.' },
        { status: 403 }
      );
    }

    // 3. Upsert the record – if current user already has a row, it will update
    const { error } = await supabase
      .from('upwork_auth')
      .upsert(
        {
          user_id: session.user.userId,
          email,
          password,
          updated_at: new Date(),
        },
        { onConflict: 'user_id' }   // user_id is unique
      );

    if (error) throw error;

    // Update session flag
    session.user.upworkConnected = true;
    await session.save();

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

  session.user.upworkConnected = false;
  await session.save();

  return NextResponse.json({ success: true });
}