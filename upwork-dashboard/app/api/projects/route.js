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
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', session.user.userId)
    .order('id', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = session.user.userId;
    const payload = Array.isArray(body)
      ? body.map((item) => ({ ...item, user_id: userId }))
      : { ...body, user_id: userId };

    const { data, error } = await supabase
      .from('portfolio')
      .upsert(payload)
      .select();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.userId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await supabase
    .from('portfolio')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return NextResponse.json({ success: true });
}