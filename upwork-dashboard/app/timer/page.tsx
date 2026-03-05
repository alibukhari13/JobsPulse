"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function TimerPage() {
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [s, setS] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const totalMins = data.expiry_minutes;
        setH(Math.floor(totalMins / 60));
        setM(Math.floor(totalMins % 60));
        setS(Math.round((totalMins % 1) * 60));
      });
  }, []);

  const saveTimer = async () => {
    setLoading(true);
    // Convert everything to minutes for database
    const totalMinutes = h * 60 + m + s / 60;

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: totalMinutes }),
      });
      alert("System Protocol Updated! ⚡");
    } catch (err) {
      alert("Sync Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans antialiased">
      <Sidebar />
      <main className="flex-1 lg:ml-72 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-2xl text-center mb-10">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4">Data Lifecycle</h1>
          <p className="text-slate-500 text-sm">Set independent values for Hours, Minutes, or Seconds.</p>
        </div>

        <div className="w-full max-w-2xl bg-[#0B1120] border border-slate-800/60 rounded-[3.5rem] p-12 shadow-2xl">
          <div className="flex justify-center gap-6 mb-12">
            {[
              { label: "Hours", val: h, set: setH },
              { label: "Minutes", val: m, set: setM },
              { label: "Seconds", val: s, set: setS },
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="bg-slate-950 border-2 border-emerald-500/20 rounded-[2rem] w-28 h-28 flex items-center justify-center shadow-lg">
                  <input 
                    type="number" 
                    value={unit.val} 
                    onChange={(e) => unit.set(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-transparent text-4xl font-black text-white outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-4">{unit.label}</span>
              </div>
            ))}
          </div>

          <button onClick={saveTimer} disabled={loading} className="w-full py-6 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all shadow-xl uppercase tracking-widest text-xs">
            {loading ? "Syncing..." : "Apply Global Timer"}
          </button>
        </div>
      </main>
    </div>
  );
}