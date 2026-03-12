import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
    process.env.SUPABASE_URL || "https://mktrthxggufposxyubuh.supabase.co", 
  process.env.SUPABASE_KEY || "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf"
//   process.env.SUPABASE_URL || "https://zpgcldllammzlxkktpfv.supabase.co", 
//   process.env.SUPABASE_KEY || "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
);

export async function POST(req) {
    try {
        const job = await req.json();

        // 1. Fetch Custom Format
        const { data: format } = await supabase.from('proposal_format').select('*').order('order_index', { ascending: true });
        let formatInstructions = "MANDATORY PROPOSAL STRUCTURE (Follow this exact order):\n";
        format?.forEach((f, i) => {
            formatInstructions += `${i+1}. ${f.section_name}: ${f.section_instruction}\n`;
        });

        // 2. Fetch Portfolio
        const { data: portfolio } = await supabase.from('portfolio').select('*');
        let portfolioContext = "MY PORTFOLIO PROJECTS:\n" + 
                               portfolio?.map(p => `- ${p.project_name}: ${p.project_description} (Link: ${p.project_link})`).join("\n");

        // 3. Fetch History (Style Training)
        const { data: history } = await supabase.from('proposals').select('proposal_text').order('updated_at', { ascending: false }).limit(3);
        let styleContext = "User's Writing Style Examples:\n" + history?.map(h => h.proposal_text).join("\n---\n");

        const prompt = `
        You are a professional Upwork Freelancer. Write a winning proposal.

        ${formatInstructions}

        JOB CONTEXT:
        - Title: ${job.job_title}
        - Description: ${job.job_description}
        - Skills: ${job.job_tags}
        - Client Location: ${job.client_location}

        ${portfolioContext}

        ${styleContext}

        FINAL RULES:
        - Strictly follow the numbered structure provided above.
        - Only mention portfolio projects if they directly relate to the job.
        - Keep the tone professional but high-energy.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are a professional Upwork proposal writer." }, { role: "user", content: prompt }],
            temperature: 0.7,
        });

        return NextResponse.json({ proposal: response.choices[0].message.content });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}