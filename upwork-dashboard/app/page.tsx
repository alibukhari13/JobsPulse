/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import ProposalModal from "@/components/ProposalModal";
import Sidebar from "@/components/Sidebar";

// --- PREMIUM BOXED TIMER COMPONENT (UTC & INSTANT PURGE FIX) ---
function JobTimer({ createdAt, expiryMins, onExpire }: { createdAt: string, expiryMins: number | null, onExpire: () => void }) {
  const [time, setTime] = useState({ h: "00", m: "00", s: "00" });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (expiryMins === null || expiryMins <= 0) return;

    const calculateTime = () => {
      // Convert Supabase UTC string to local timestamp for 100% accuracy
      const createdDate = new Date(createdAt).getTime();
      const expiryTime = createdDate + (expiryMins * 60 * 1000);
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        onExpire(); // Trigger instant deletion from UI and DB
        return false;
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTime({
          h: h.toString().padStart(2, '0'),
          m: m.toString().padStart(2, '0'),
          s: s.toString().padStart(2, '0')
        });
        setIsReady(true);
        return true;
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt, expiryMins, onExpire]);

  if (!isReady) return <div className="w-20 h-8 bg-slate-800/50 animate-pulse rounded-md"></div>;

  return (
    <div className="flex gap-1 items-center">
      {[
        { val: time.h, label: "H" },
        { val: time.m, label: "M" },
        { val: time.s, label: "S" }
      ].map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-slate-800 border border-slate-700 rounded-md w-8 h-8 flex items-center justify-center shadow-inner">
            <span className="text-[11px] font-black text-emerald-400 font-mono">{unit.val}</span>
          </div>
          <span className="text-[6px] font-black uppercase text-slate-500 mt-0.5">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [expiryMins, setExpiryMins] = useState<number | null>(null); // Start with null to prevent race condition
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const jobsPerPage = 8;

  const fetchJobs = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Pehle Settings fetch karein taake sahi timer milay
      const sRes = await fetch("/api/settings-s/timer");
      const sData = await sRes.json();
      if (sData.expiry_minutes) setExpiryMins(sData.expiry_minutes);

      // 2. Phir Jobs fetch karein
      const res = await fetch(`/api/jobs?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
    } catch (err) { console.log("Sync Error"); }
    finally { setTimeout(() => setIsSyncing(false), 800); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleIgnore = useCallback(async (jobId: string) => {
    // Optimistic UI update: foran UI se hatao
    setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
    try {
      await fetch(`/api/jobs?id=${jobId}`, { method: "DELETE" });
    } catch (err) { console.error("Delete failed"); }
  }, []);

  const toggleDescription = (jobId: string) => {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const currentJobs = jobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans antialiased text-[14px]">
      {selectedJob && <ProposalModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      <Sidebar isSyncing={isSyncing} />

      <main className="flex-1 p-4 lg:ml-72 lg:p-12">
        <div className="mx-auto max-w-5xl">
          <header className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1 w-10 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Upwork Deep Scrape</span>
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-none">Recent Feed</h1>
            </div>
            <div className="flex items-center gap-6 bg-[#0B1120] p-3 rounded-[2.5rem] border border-slate-800 shadow-2xl">
              <div className="px-8 py-2 text-center border-r border-slate-800">
                <p className="text-3xl font-black text-white leading-none">{jobs.length}</p>
                <p className="text-[10px] font-bold uppercase text-slate-500 mt-2 tracking-widest">Jobs Found</p>
              </div>
              <button onClick={fetchJobs} className="p-4 hover:bg-slate-800 rounded-full transition-all active:scale-90 group">
                <svg className={`h-6 w-6 text-slate-400 group-hover:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </header>

          <div className="space-y-8">
            {currentJobs.map((job) => {
              const isExpanded = expandedJobs[job.job_id];
              const isNew = job.posted_date?.toLowerCase().includes('second') || job.posted_date?.toLowerCase().includes('minute');

              return (
                <div key={job.job_id} className="group relative rounded-[2.5rem] border border-slate-800/80 bg-[#0B1120] p-10 transition-all hover:border-emerald-500/40 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap gap-3 items-center">
                        {isNew && currentPage === 1 && <span className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-pulse">NEW ARRIVAL</span>}
                        {job.is_verified === "Verified" ? (
                          <span className="flex items-center gap-1 bg-blue-600/20 text-blue-400 text-[9px] font-black px-3 py-1 rounded-lg border border-blue-500/20 tracking-tighter uppercase">Verified</span>
                        ) : (
                          <span className="bg-red-900/20 text-red-400 text-[9px] font-black px-3 py-1 rounded-lg border border-red-500/20 tracking-tighter uppercase">Unverified</span>
                        )}
                        <span className="bg-slate-800/50 text-slate-400 text-[9px] font-bold px-3 py-1 rounded-lg tracking-widest uppercase border border-slate-700/50">{job.client_location}</span>
                        <span className="bg-purple-500/10 text-purple-400 text-[9px] font-bold px-3 py-1 rounded-lg border border-purple-500/20 uppercase tracking-widest">{job.experience_level}</span>
                      </div>
                      
                      {/* TIMER & IGNORE BUTTON - TOP RIGHT ALIGNMENT */}
                      <div className="flex items-center gap-6">
                        {expiryMins !== null && expiryMins > 0 && (
                          <JobTimer 
                            createdAt={job.created_at} 
                            expiryMins={expiryMins} 
                            onExpire={() => handleIgnore(job.job_id)} 
                          />
                        )}
                        <button onClick={() => handleIgnore(job.job_id)} className="flex items-center gap-2 text-slate-600 hover:text-red-400 transition-all group/btn">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity">Ignore</span>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    <a href={job.job_url} target="_blank" className="text-3xl font-black text-white hover:text-emerald-400 transition-colors leading-[1.1] tracking-tight">{job.job_title}</a>
                    
                    {/* SKILLS TAGS SECTION RESTORED */}
                    <div className="flex flex-wrap gap-2">
                      {job.job_tags?.split(',').map((tag: string, i: number) => (
                        <span key={i} className="bg-slate-900 text-slate-400 text-[10px] font-bold px-4 py-1.5 rounded-xl border border-slate-800 transition-colors">{tag.trim()}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-slate-800/50">
                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Budget / Rate</span><span className="text-sm font-bold text-emerald-500">{job.budget}</span></div>
                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Duration</span><span className="text-sm font-bold text-slate-200">{job.project_duration}</span></div>
                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Proposals</span><span className="text-sm font-bold text-slate-200">{job.job_proposals}</span></div>
                      <div className="flex flex-col"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Posted</span><span className="text-sm font-bold text-slate-200">{job.posted_date}</span></div>
                    </div>

                    <div className="relative">
                      <p className={`text-slate-400 text-base leading-relaxed font-medium italic ${!isExpanded ? 'line-clamp-3' : ''}`}>{job.job_description}</p>
                      {job.job_description?.length > 200 && (
                        <button onClick={() => toggleDescription(job.job_id)} className="text-emerald-500 text-[11px] font-black uppercase mt-4 hover:text-emerald-400 transition-all flex items-center gap-2">
                          {isExpanded ? "↑ Collapse Details" : "↓ Expand Full Description"}
                        </button>
                      )}
                    </div>

                    <div className="pt-4 flex justify-between items-center border-t border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Client Spent:</span>
                        <span className="text-[10px] font-bold text-slate-400">{job.client_spent}</span>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setSelectedJob(job)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[1.5rem] text-sm font-black transition-all shadow-xl shadow-blue-900/20 active:scale-95 uppercase tracking-widest"
                        >
                          Generate Proposal ✨
                        </button>
                        <a href={job.job_url} target="_blank" className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-[1.5rem] text-sm font-black transition-all active:scale-95 uppercase tracking-widest">Apply on Upwork</a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-20 flex items-center justify-center gap-4 pb-20">
              <button disabled={currentPage === 1} onClick={() => {setCurrentPage(currentPage - 1); window.scrollTo({top:0, behavior:'smooth'})}} className="h-14 w-14 flex items-center justify-center rounded-2xl border border-slate-800 bg-[#0B1120] text-slate-400 hover:border-emerald-500 transition-all disabled:opacity-10">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-10 h-14 flex items-center rounded-2xl border border-slate-800 bg-[#0B1120] text-xs font-black text-slate-400 uppercase tracking-widest">
                Page <span className="text-white mx-2 text-lg">{currentPage}</span> of {totalPages}
              </div>
              <button disabled={currentPage === totalPages} onClick={() => {setCurrentPage(currentPage + 1); window.scrollTo({top:0, behavior:'smooth'})}} className="h-14 w-14 flex items-center justify-center rounded-2xl border border-slate-800 bg-[#0B1120] text-slate-400 hover:border-emerald-500 transition-all disabled:opacity-10">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}