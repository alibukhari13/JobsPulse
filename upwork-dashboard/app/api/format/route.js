import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co", 
  process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf"
//   process.env.SUPABASE_URL || "https://zpgcldllammzlxkktpfv.supabase.co", 
//   process.env.SUPABASE_KEY || "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
);

export async function GET() {
    const { data } = await supabase.from('proposal_format').select('*').order('order_index', { ascending: true });
    return NextResponse.json(data || []);
}

export async function POST(req) {
    try {
        const body = await req.json();
        // upsert handles both single object and array
        const { data, error } = await supabase.from('proposal_format').upsert(body).select();
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const { error } = await supabase.from('proposal_format').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}