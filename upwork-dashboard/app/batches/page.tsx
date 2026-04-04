// app/batches/page.tsx
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function ScraperSettings() {
  const [batches, setBatches] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings-s/batches")
      .then((res) => res.json())
      .then((data) => {
        setBatches(data.batch_limit || 3);
      });
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings-s/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_limit: batches }),
      });

      if (res.ok) {
        alert("Scraper Engine Reconfigured! 🚀");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      alert("Failed to sync settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center p-4 pt-24 md:p-12 overflow-x-hidden">
        <div className="w-full max-w-xl mb-8 md:mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter mb-3 md:mb-4">Scraper Batches</h1>
          <p className="text-secondary text-xs md:text-sm font-medium leading-relaxed">Define the crawling depth for each cycle.</p>
        </div>

        <div className="w-full max-w-xl bg-surface border border-custom rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-14 shadow-2xl">
            <div className="flex justify-between mb-8 md:mb-12 gap-1 md:gap-1.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`h-1 md:h-1.5 flex-1 rounded-full transition-all duration-500 ${i < batches ? "bg-accent shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-border"}`} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 mb-8 md:mb-12">
              <button onClick={() => setBatches(Math.max(1, batches - 1))} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-light border border-custom flex items-center justify-center text-xl md:text-2xl text-secondary hover:text-primary transition-all active:scale-90 shadow-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <span className="text-6xl md:text-8xl font-black text-primary tracking-tighter">{batches}</span>
                  <span className="absolute -top-1 md:-top-2 -right-6 md:-right-8 text-accent font-black text-lg md:text-xl">/10</span>
                </div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-muted mt-2">Active Batches</span>
              </div>
              <button onClick={() => setBatches(Math.min(10, batches + 1))} className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-light border border-custom flex items-center justify-center text-xl md:text-2xl text-secondary hover:text-primary transition-all active:scale-90 shadow-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            <button onClick={saveSettings} disabled={loading} className="w-full py-4 md:py-6 rounded-xl md:rounded-2xl bg-accent text-white font-black hover:bg-accent-hover transition-all shadow-xl uppercase tracking-widest text-[10px] md:text-xs">
              {loading ? "Syncing..." : "Save Batch Limit"}
            </button>
        </div>
      </main>
    </div>
  );
}