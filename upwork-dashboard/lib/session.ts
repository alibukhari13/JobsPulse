// lib/session.ts
import { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
  upworkConnected?: boolean; // ✅ New field
}

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD || "complex_password_at_least_32_characters_long_here",
  cookieName: "jobpulse-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    path: "/",
  },
};

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionData;
  }
}