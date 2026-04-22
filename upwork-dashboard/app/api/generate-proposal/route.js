import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  const session = await getIronSession(await cookies(), sessionOptions);
  if (!session.user?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const job = await request.json();

    const { data: format } = await supabase
      .from('proposal_format')
      .select('*')
      .eq('user_id', session.user.userId)
      .order('order_index', { ascending: true });

    let formatInstructions = "MANDATORY PROPOSAL STRUCTURE (Follow this exact order):\n";
    format?.forEach((f, i) => {
      formatInstructions += `${i + 1}. ${f.section_name}: ${f.section_instruction}\n`;
    });

    const { data: portfolio } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', session.user.userId);

    let portfolioContext = "MY PORTFOLIO PROJECTS:\n" +
      portfolio?.map(p => `- ${p.project_name}: ${p.project_description} (Link: ${p.project_link})`).join("\n");

    const { data: history } = await supabase
      .from('proposals')
      .select('proposal_text')
      .eq('user_id', session.user.userId)
      .order('updated_at', { ascending: false })
      .limit(3);

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}