"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function ScraperSettings() {
  const [batches, setBatches] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/scraper-settings")
      .then((res) => res.json())
      .then((data) => {
        setBatches(data.batch_limit || 3);
      });
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await fetch("/api/scraper-settings", {
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
        
        {/* 1. Header Section */}
        <div className="w-full max-w-xl mb-10 text-center">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4">Scraper Batches</h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Define the crawling depth for each cycle. Higher batches capture more historical data but increase processing time.
          </p>
        </div>

        <div className="w-full max-w-xl relative">
          <div className="absolute -inset-4 bg-emerald-500/5 rounded-[4rem] blur-3xl"></div>

          <div className="relative bg-[#0B1120] border border-slate-800/60 rounded-[3.5rem] p-10 md:p-14 shadow-2xl">
            
            {/* Visual Progress Indicator */}
            <div className="flex justify-between mb-12 gap-1.5">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    i < batches ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Interactive Stepper */}
            <div className="flex items-center justify-between gap-4 mb-12">
              <button 
                onClick={() => setBatches(Math.max(1, batches - 1))}
                className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all active:scale-90 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>

              <div className="flex flex-col items-center">
                <div className="relative">
                  <span className="text-8xl font-black text-white tracking-tighter">{batches}</span>
                  <span className="absolute -top-2 -right-8 text-emerald-500 font-black text-xl">/10</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Active Batches</span>
              </div>

              <button 
                onClick={() => setBatches(Math.min(10, batches + 1))}
                className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all active:scale-90 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            {/* Logic Summary Box */}
            <div className="bg-slate-950/40 border border-slate-800/40 rounded-3xl p-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Scrape Depth</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The engine will perform <span className="text-white font-bold">{batches}</span> &ldquo;Learn More&ldquo; clicks per cycle, capturing approximately <span className="text-white font-bold">{batches * 10}+</span> jobs.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={saveSettings}
              disabled={loading}
              className="w-full group relative overflow-hidden py-6 rounded-2xl bg-emerald-600 text-white font-black transition-all hover:bg-emerald-500 active:scale-[0.98] shadow-xl shadow-emerald-900/10"
            >
              <div className="relative z-10 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Commit Engine Settings
                  </>
                )}
              </div>
              {/* Shine Effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
            </button>
          </div>
        </div>

        {/* Industrial Footer */}
        {/* <div className="mt-16 flex items-center gap-8 opacity-30">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest">Max Limit</span>
            <span className="text-[8px] font-bold tracking-widest">10 BATCHES</span>
          </div>
          <div className="w-[1px] h-4 bg-slate-700"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest">Protocol</span>
            <span className="text-[8px] font-bold tracking-widest">HTTP/2 CLOUD</span>
          </div>
        </div> */}
      </main>

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}