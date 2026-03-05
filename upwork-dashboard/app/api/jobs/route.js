import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL || "https://zpgcldllammzlxkktpfv.supabase.co", 
  process.env.SUPABASE_KEY || "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
)

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get Expiry Setting from Supabase
        const { data: settings } = await supabase.from('settings').select('expiry_minutes').single();
        const expiryMins = settings?.expiry_minutes || 360; // Default 6 hours

        // 2. Auto-Delete Expired Jobs
        const cutoffTime = new Date(Date.now() - expiryMins * 60 * 1000).toISOString();
        await supabase.from('jobs').delete().lt('created_at', cutoffTime);

        // 3. Fetch Remaining Jobs
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error; 
        return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const { error } = await supabase.from('jobs').delete().eq('job_id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}