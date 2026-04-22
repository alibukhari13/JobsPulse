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

  try {
    const userId = session.user.userId;
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("GET Error:", err instanceof Error ? err.message : err);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session || !session.user || !session.user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.userId;
    const body = await request.json();
    console.log("Saving Proposal for:", body.jobId);

    const { data, error } = await supabase
      .from('proposals')
      .upsert(
        {
          job_id: body.jobId,
          job_title: body.jobTitle,
          proposal_text: body.proposalText,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_id, user_id' }
      )
      .select();

    if (error) {
      console.error("Supabase Insert Error:", error.message);
      throw error;
    }

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

  try {
    const userId = session.user.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}