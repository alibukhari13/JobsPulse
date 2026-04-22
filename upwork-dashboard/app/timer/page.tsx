"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/context/ToastContext";

export default function TimerPage() {
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [s, setS] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { showToast } = useToast();

  // ✅ Listen to sidebar collapse events
  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
    return () => window.removeEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
  }, []);

  useEffect(() => {
    fetch("/api/settings-s/timer")
      .then((res) => res.json())
      .then((data) => {
        const totalMins = data.expiry_minutes || 0;
        setH(Math.floor(totalMins / 60));
        setM(Math.floor(totalMins % 60));
        setS(Math.round(((totalMins * 60) % 60)));
      });
  }, []);

  const saveTimer = async () => {
    setLoading(true);
    const totalMinutes = (Number(h) * 60) + Number(m) + (Number(s) / 60);

    try {
      const res = await fetch("/api/settings-s/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry_minutes: totalMinutes }),
      });
      if (res.ok) {
        showToast("System Protocol Updated! ⚡", "success");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      showToast("Sync Error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased overflow-x-hidden">
      <Sidebar />
      <main className={`flex-1 w-full p-4 pt-24 md:p-12 overflow-x-hidden transition-all duration-500 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} flex flex-col items-center justify-center`}>
        <div className="w-full max-w-xl text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/5 border border-accent/10 mb-4 md:mb-6">
            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-accent animate-pulse"></div>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-accent/80">Automated Maintenance Engine</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter mb-3 md:mb-4">Data Lifecycle</h1>
          <p className="text-secondary text-xs md:text-sm">Set independent values for Hours, Minutes, or Seconds.</p>
        </div>

        <div className="w-full max-w-xl bg-surface border border-custom rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 shadow-2xl">
          <div className="flex justify-center gap-3 md:gap-6 mb-8 md:mb-12">
            {[
              { label: "Hours", val: h, set: setH },
              { label: "Minutes", val: m, set: setM },
              { label: "Seconds", val: s, set: setS },
            ].map((unit, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="bg-surface-light border-2 border-accent/20 rounded-2xl md:rounded-[2rem] w-full aspect-square max-w-[112px] flex items-center justify-center shadow-lg">
                  <input 
                    type="number" 
                    value={unit.val} 
                    onChange={(e) => unit.set(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-transparent text-2xl md:text-4xl font-black text-primary outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted mt-3 md:mt-4">{unit.label}</span>
              </div>
            ))}
          </div>

          <button onClick={saveTimer} disabled={loading} className="w-full py-4 md:py-6 rounded-xl md:rounded-2xl bg-accent text-white font-black hover:bg-accent-hover transition-all shadow-xl uppercase tracking-widest text-[10px] md:text-xs">
            {loading ? "Syncing..." : "Apply Global Timer"}
          </button>
        </div>
      </main>
    </div>
  );
}