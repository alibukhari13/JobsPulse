import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL || "https://zpgcldllammzlxkktpfv.supabase.co", 
  process.env.SUPABASE_KEY || "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
);

export async function GET() {
    // Hamesha id=1 wali row uthao
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    return NextResponse.json(data || { expiry_minutes: 360, batch_limit: 3 });
}

export async function POST(req) {
    try {
        const body = await req.json();
        // Upsert specifically for id: 1
        const { data, error } = await supabase.from('settings').upsert({
            id: 1,
            ...body,
            updated_at: new Date().toISOString()
        }).select();
        
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}