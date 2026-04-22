// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ✅ Check if user has already connected Upwork
    const { data: upworkAuth } = await supabase
      .from('upwork_auth')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const session = await getIronSession<{ user: SessionData }>(await cookies(), sessionOptions);
    session.user = {
      userId: user.id,
      email: user.email,
      isLoggedIn: true,
      upworkConnected: !!upworkAuth,
    };
    await session.save();

    return NextResponse.json({ success: true, user: { email: user.email } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}