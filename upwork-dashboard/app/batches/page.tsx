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
      await fetch("/api/settings-s-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_limit: batches }),
      });
      alert("Scraper Engine Reconfigured! 🚀");
    } catch (err) {
      alert("Failed to sync settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans antialiased">
      <Sidebar />
      <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-xl mb-10 text-center">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4">Scraper Batches</h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">Define the crawling depth for each cycle.</p>
        </div>

        <div className="w-full max-w-xl bg-[#0B1120] border border-slate-800/60 rounded-[3.5rem] p-10 md:p-14 shadow-2xl">
            <div className="flex justify-between mb-12 gap-1.5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < batches ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-slate-800"}`} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 mb-12">
              <button onClick={() => setBatches(Math.max(1, batches - 1))} className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-slate-400 hover:text-white transition-all active:scale-90 shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <span className="text-8xl font-black text-white tracking-tighter">{batches}</span>
                  <span className="absolute -top-2 -right-8 text-emerald-500 font-black text-xl">/10</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Active Batches</span>
              </div>
              <button onClick={() => setBatches(Math.min(10, batches + 1))} className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-slate-400 hover:text-white transition-all active:scale-90 shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            <button onClick={saveSettings} disabled={loading} className="w-full py-6 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all shadow-xl uppercase tracking-widest text-xs">
              {loading ? "Syncing..." : "Save Batch Limit"}
            </button>
        </div>
      </main>
    </div>
  );
}