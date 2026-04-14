/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-custom rounded-[2rem] p-8 shadow-2xl">
        <h1 className="text-3xl font-black text-primary mb-2">Welcome back</h1>
        <p className="text-secondary text-sm mb-8">Sign in to your dashboard</p>
        {error && (
          <div className="bg-danger/10 text-danger p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-light border border-custom rounded-xl p-4 text-primary outline-none focus:border-accent transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-light border border-custom rounded-xl p-4 text-primary outline-none focus:border-accent transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-black py-4 rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-secondary text-sm mt-6">
          Don&lsquo;t have an account?{" "}
          <Link href="/signup" className="text-accent font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}