/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function HistoryPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Listen to sidebar collapse events
  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
    return () => window.removeEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals?t=${Date.now()}`);
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      console.error("Fetch Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProposals(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this proposal?")) return;
    setProposals(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/proposals?id=${id}`, { method: "DELETE" });
  };

  const handleUpdate = async (p: any) => {
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: p.job_id,
        jobTitle: p.job_title,
        proposal_text: p.proposal_text
      }),
    });
    if (res.ok) alert("Changes Saved & AI Trained! ✅");
  };

  const updateLocalText = (id: number, newText: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, proposal_text: newText } : p));
  };

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased text-[14px] overflow-x-hidden">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--color-border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-accent); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-accent-hover); }
      `}</style>

      <Sidebar />

      <main className={`flex-1 w-full p-4 pt-24 lg:pt-12 overflow-x-hidden transition-all duration-500 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} lg:p-12`}>
        {/* ✅ Responsive container width */}
        <div className={`mx-auto w-full transition-all duration-500 ${sidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <header className="mb-8 md:mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1 w-10 bg-accent rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Proposal Memory Bank</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tight leading-none break-words">AI History</h1>
            </div>
            <div className="bg-surface px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2rem] border border-custom shadow-xl text-center self-start md:self-auto">
              <p className="text-2xl md:text-3xl font-black text-accent leading-none">{proposals.length}</p>
              <p className="text-[8px] md:text-[10px] font-bold uppercase text-muted mt-2 tracking-widest">Total Drafts</p>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32">
              <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-muted font-bold uppercase tracking-widest text-[10px] md:text-xs">Syncing with Cloud...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:gap-8 w-full">
              {proposals.length > 0 ? proposals.map((p) => (
                <div key={p.id} className="group relative rounded-[1.5rem] md:rounded-[2.5rem] border border-custom bg-surface p-5 md:p-8 transition-all hover:border-accent/30 shadow-xl overflow-hidden w-full">
                  <div className="flex flex-col gap-4 md:gap-6">
                    <div className="flex justify-between items-start gap-4">
                      <h2 className="text-lg md:text-2xl font-black text-primary leading-tight line-clamp-2 md:line-clamp-1 break-words">{p.job_title}</h2>
                      <button onClick={() => handleDelete(p.id)} className="flex-shrink-0 p-2.5 md:p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all">
                        <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="relative">
                      <textarea 
                        value={p.proposal_text}
                        onChange={(e) => updateLocalText(p.id, e.target.value)}
                        className="custom-scrollbar w-full h-48 md:h-56 bg-surface-light border border-custom rounded-xl md:rounded-2xl p-4 md:p-6 text-primary text-sm leading-relaxed focus:border-accent outline-none transition-all resize-none overflow-y-auto shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-custom">
                      <span className="text-[9px] md:text-[10px] text-muted font-mono uppercase tracking-tighter self-start md:self-auto">Last Updated: {new Date(p.updated_at).toLocaleString()}</span>
                      <button onClick={() => handleUpdate(p)} className="w-full md:w-auto bg-accent hover:bg-accent-hover text-white px-8 md:px-10 py-3 md:py-3.5 rounded-xl text-[10px] md:text-xs font-black transition-all shadow-lg active:scale-95 uppercase tracking-widest">Save & Train AI</button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 md:py-32 border-2 border-dashed border-custom rounded-[2rem] md:rounded-[3rem] bg-surface/50">
                  <p className="text-muted font-bold uppercase tracking-widest text-xs md:text-sm">No Proposals in Memory Bank</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}