import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL || "https://vdhylaaoljrvvqrygsom.supabase.co", 
  process.env.SUPABASE_KEY || "ssb_publishable_rPyfp5viSf77gGqxc0w27g_k2hI3QuI"
);

export async function GET() {
    const { data } = await supabase.from('upwork_auth').select('email').single();
    return NextResponse.json({ isConnected: !!data, email: data?.email || null });
}

export async function POST(req) {
    try {
        const { email, password } = await req.json();
        const { data, error } = await supabase.from('upwork_auth').upsert({
            id: 1, email, password, updated_at: new Date()
        }).select();
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE() {
    await supabase.from('upwork_auth').delete().eq('id', 1);
    return NextResponse.json({ success: true });
}

