/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ email, password_hash })
      .select("id, email")
      .single();

    if (error) throw error;

    // ✅ Create default settings for this user
    const { error: settingsError } = await supabase
      .from("settings")
      .upsert(
        {
          id: 1,
          user_id: newUser.id,
          expiry_minutes: 360,
          batch_limit: 3,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, id" }
      );

    if (settingsError) {
      console.error("Failed to create default settings:", settingsError.message);
      // Settings creation fail hone par bhi signup successful rahega
    }

    // Create session
    const session = await getIronSession<{ user: SessionData }>(
      await cookies(),
      sessionOptions
    );
    session.user = {
      userId: newUser.id,
      email: newUser.email,
      isLoggedIn: true,
    };
    await session.save();

    return NextResponse.json({ success: true, user: { email: newUser.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}