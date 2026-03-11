import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL || "https://vdhylaaoljrvvqrygsom.supabase.co", 
  process.env.SUPABASE_KEY || "ssb_publishable_rPyfp5viSf77gGqxc0w27g_k2hI3QuI"
)

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Pehle settings se asli expiry minutes uthao
        const { data: settings } = await supabase.from('settings').select('expiry_minutes').eq('id', 1).single();
        
        // 2. Agar setting mil jaye aur 0 na ho, tabhi delete karo
        if (settings && settings.expiry_minutes > 0) {
            const expiryMins = settings.expiry_minutes;
            
            // UTC based cutoff calculation
            const cutoffTime = new Date(Date.now() - (expiryMins * 60 * 1000)).toISOString();
            
            // Delete only if older than cutoff
            await supabase.from('jobs').delete().lt('created_at', cutoffTime);
        }

        // 3. Fetch remaining jobs
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error; 
        return NextResponse.json(jobs, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await supabase.from('jobs').delete().eq('job_id', id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}