import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
   process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co", 
  process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf"
//   process.env.SUPABASE_URL || "https://zpgcldllammzlxkktpfv.supabase.co", 
//   process.env.SUPABASE_KEY || "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
);

export async function GET() {
    try {
        const { data, error } = await supabase.from('proposals').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("GET Error:", error.message);
        return NextResponse.json([]);
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        console.log("Saving Proposal for:", body.jobId);

        const { data, error } = await supabase.from('proposals').upsert({
            job_id: body.jobId,
            job_title: body.jobTitle,
            proposal_text: body.proposalText,
            updated_at: new Date().toISOString()
        }, { onConflict: 'job_id' }).select();

        if (error) {
            console.error("Supabase Insert Error:", error.message);
            throw error;
        }
        
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const { error } = await supabase.from('proposals').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}