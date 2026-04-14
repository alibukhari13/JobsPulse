import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mktrthxggufposxyubuh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash })
      .select('id, email')
      .single();

    if (insertError) throw insertError;

    // Create default settings
    await supabase
      .from('settings')
      .upsert(
        {
          id: 1,
          user_id: newUser.id,
          expiry_minutes: 360,
          batch_limit: 3,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, id' }
      );

    const session = await getIronSession<{ user: SessionData }>(await cookies(), sessionOptions);
    session.user = {
      userId: newUser.id,
      email: newUser.email,
      isLoggedIn: true,
    };
    await session.save();

    return NextResponse.json({ success: true, user: { email: newUser.email } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}