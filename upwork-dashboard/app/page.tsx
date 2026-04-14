/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ProposalModal from "@/components/ProposalModal";
import Sidebar from "@/components/Sidebar";

// --- Skeleton Loader Component ---
const JobSkeleton = () => (
  <div className="rounded-[1.5rem] md:rounded-[2.5rem] border border-custom bg-surface p-5 md:p-10 animate-pulse w-full">
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-surface-light rounded-full"></div>
          <div className="h-6 w-16 bg-surface-light rounded-full"></div>
        </div>
        <div className="h-8 w-24 bg-surface-light rounded-md"></div>
      </div>
      <div className="h-8 w-3/4 bg-surface-light rounded-md"></div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-surface-light rounded-xl"></div>
        <div className="h-6 w-20 bg-surface-light rounded-xl"></div>
        <div className="h-6 w-14 bg-surface-light rounded-xl"></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-custom">
        <div className="h-10 bg-surface-light rounded"></div>
        <div className="h-10 bg-surface-light rounded"></div>
        <div className="h-10 bg-surface-light rounded"></div>
        <div className="h-10 bg-surface-light rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-surface-light rounded w-full"></div>
        <div className="h-4 bg-surface-light rounded w-5/6"></div>
        <div className="h-4 bg-surface-light rounded w-4/6"></div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <div className="h-12 w-40 bg-surface-light rounded-xl"></div>
        <div className="h-12 w-40 bg-surface-light rounded-xl"></div>
      </div>
    </div>
  </div>
);

// --- Job Timer Component ---
function JobTimer({ createdAt, expiryMins, onExpire }: { createdAt: string; expiryMins: number | null; onExpire: () => void }) {
  const [time, setTime] = useState({ h: "00", m: "00", s: "00" });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (expiryMins === null || expiryMins <= 0) return;

    const calculateTime = () => {
      const createdDate = new Date(createdAt).getTime();
      const expiryTime = createdDate + expiryMins * 60 * 1000;
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        onExpire();
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

  if (!isReady) return <div className="w-20 h-8 bg-surface-light animate-pulse rounded-md"></div>;

  return (
    <div className="flex gap-1 items-center">
      {[ { val: time.h, label: "H" }, { val: time.m, label: "M" }, { val: time.s, label: "S" } ].map((unit, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-surface border border-custom rounded-md w-7 h-7 md:w-8 md:h-8 flex items-center justify-center shadow-inner">
            <span className="text-[10px] md:text-[11px] font-black text-accent font-mono">{unit.val}</span>
          </div>
          <span className="text-[6px] font-black uppercase text-muted mt-0.5">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [expiryMins, setExpiryMins] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isWaitingForNewJobs, setIsWaitingForNewJobs] = useState(false); // New state
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const jobsPerPage = 8;
  const initialLoadRef = useRef(true);
  const quickPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const normalPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const sRes = await fetch("/api/settings-s/timer");
      const sData = await sRes.json();
      if (sData.expiry_minutes) setExpiryMins(sData.expiry_minutes);

      const res = await fetch(`/api/jobs?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
        // If we were waiting for new jobs and now we have some, stop waiting
        if (data.length > 0 && isWaitingForNewJobs) {
          setIsWaitingForNewJobs(false);
        }
      }
    } catch (err) {
      console.log("Sync Error");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [isWaitingForNewJobs]);

  // Start quick polling (every 3s) after clear
  const startQuickPolling = useCallback(() => {
    if (quickPollIntervalRef.current) clearInterval(quickPollIntervalRef.current);
    quickPollIntervalRef.current = setInterval(() => {
      fetchJobs(true); // silent fetch
    }, 3000);
  }, [fetchJobs]);

  // Stop quick polling and resume normal polling (30s)
  const stopQuickPollingAndResumeNormal = useCallback(() => {
    if (quickPollIntervalRef.current) {
      clearInterval(quickPollIntervalRef.current);
      quickPollIntervalRef.current = null;
    }
    // Normal polling is already running via useEffect
  }, []);

  // Effect to handle isWaitingForNewJobs changes
  useEffect(() => {
    if (isWaitingForNewJobs) {
      startQuickPolling();
    } else {
      stopQuickPollingAndResumeNormal();
    }
  }, [isWaitingForNewJobs, startQuickPolling, stopQuickPollingAndResumeNormal]);

  // Clear all jobs for current user and trigger fresh scrape
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL jobs? This cannot be undone.")) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/jobs/clear", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear jobs");
      
      // Clear current jobs and set waiting state
      setJobs([]);
      setCurrentPage(1);
      setIsWaitingForNewJobs(true); // This will start quick polling and show skeleton
      
      alert("All jobs cleared. Scraping new jobs...");
    } catch (err: any) {
      alert(err.message || "Failed to clear jobs");
      setIsWaitingForNewJobs(false);
    } finally {
      setIsClearing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchJobs();
    initialLoadRef.current = false;
  }, [fetchJobs]);

  // Normal polling (30s)
  useEffect(() => {
    normalPollIntervalRef.current = setInterval(() => fetchJobs(true), 30000);
    return () => {
      if (normalPollIntervalRef.current) clearInterval(normalPollIntervalRef.current);
    };
  }, [fetchJobs]);

  // Cleanup quick polling on unmount
  useEffect(() => {
    return () => {
      if (quickPollIntervalRef.current) clearInterval(quickPollIntervalRef.current);
    };
  }, []);

  const handleIgnore = useCallback(async (jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
    try {
      await fetch(`/api/jobs?id=${jobId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete failed");
    }
  }, []);

  const toggleDescription = (jobId: string) => {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const currentJobs = jobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  // Determine what to show in the main area
  const renderContent = () => {
    // Case 1: Initial loading (first time, no jobs, syncing)
    if (jobs.length === 0 && isSyncing && !isWaitingForNewJobs) {
      return (
        <>
          <JobSkeleton />
          <JobSkeleton />
          <JobSkeleton />
        </>
      );
    }
    // Case 2: Waiting for new jobs after clear (or first load if somehow stuck)
    if (isWaitingForNewJobs) {
      return (
        <>
          <JobSkeleton />
          <JobSkeleton />
          <JobSkeleton />
        </>
      );
    }
    // Case 3: No jobs and not waiting (show empty state)
    if (currentJobs.length === 0) {
      return (
        <div className="text-center py-20 border-2 border-dashed border-custom rounded-[2rem] bg-surface/50">
          <p className="text-muted font-bold uppercase tracking-widest text-sm">No jobs found</p>
        </div>
      );
    }
    // Case 4: Has jobs
    return currentJobs.map((job) => {
      const isExpanded = expandedJobs[job.job_id];
      const isNew = job.posted_date?.toLowerCase().includes('second') || job.posted_date?.toLowerCase().includes('minute');

      return (
        <div key={job.job_id} className="group relative rounded-[1.5rem] md:rounded-[2.5rem] border border-custom bg-surface p-5 md:p-10 transition-all hover:border-accent/40 hover:shadow-xl w-full overflow-hidden">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex flex-wrap gap-2 md:gap-3 items-center">
                {isNew && currentPage === 1 && <span className="bg-accent text-white text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-full shadow-lg animate-pulse">NEW ARRIVAL</span>}
                {job.is_verified === "Verified" ? (
                  <span className="flex items-center gap-1 bg-accent/20 text-accent text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-lg border border-accent/20 tracking-tighter uppercase">Verified</span>
                ) : (
                  <span className="bg-danger/20 text-danger text-[8px] md:text-[9px] font-black px-2 md:px-3 py-1 rounded-lg border border-danger/20 tracking-tighter uppercase">Unverified</span>
                )}
                <span className="bg-surface-light text-secondary text-[8px] md:text-[9px] font-bold px-2 md:px-3 py-1 rounded-lg tracking-widest uppercase border border-custom">{job.client_location}</span>
              </div>
              
              <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                {expiryMins !== null && expiryMins > 0 && (
                  <JobTimer createdAt={job.created_at} expiryMins={expiryMins} onExpire={() => handleIgnore(job.job_id)} />
                )}
                <button onClick={() => handleIgnore(job.job_id)} className="flex items-center gap-2 text-muted hover:text-danger transition-all group/btn">
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:block opacity-0 group-hover/btn:opacity-100 transition-opacity">Ignore</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            <a href={job.job_url} target="_blank" className="text-xl md:text-3xl font-black text-primary hover:text-accent transition-colors leading-[1.2] md:leading-[1.1] tracking-tight break-words">{job.job_title}</a>
            
            <div className="flex flex-wrap gap-2">
              {job.job_tags?.split(',').map((tag: string, i: number) => (
                <span key={i} className="bg-surface-light text-secondary text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-xl border border-custom transition-colors max-w-full truncate">{tag.trim()}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 md:py-6 border-y border-custom">
              <div className="flex flex-col"><span className="text-[8px] md:text-[9px] font-black text-muted uppercase tracking-widest mb-1">Budget / Rate</span><span className="text-xs md:text-sm font-bold text-accent truncate">{job.budget}</span></div>
              <div className="flex flex-col"><span className="text-[8px] md:text-[9px] font-black text-muted uppercase tracking-widest mb-1">Duration</span><span className="text-xs md:text-sm font-bold text-primary truncate">{job.project_duration}</span></div>
              <div className="flex flex-col"><span className="text-[8px] md:text-[9px] font-black text-muted uppercase tracking-widest mb-1">Proposals</span><span className="text-xs md:text-sm font-bold text-primary truncate">{job.job_proposals}</span></div>
              <div className="flex flex-col"><span className="text-[8px] md:text-[9px] font-black text-muted uppercase tracking-widest mb-1">Posted</span><span className="text-xs md:text-sm font-bold text-primary truncate">{job.posted_date}</span></div>
            </div>

            <div className="relative">
              <p className={`text-secondary text-sm md:text-base leading-relaxed font-medium italic break-words ${!isExpanded ? 'line-clamp-3' : ''}`}>{job.job_description}</p>
              {job.job_description?.length > 200 && (
                <button onClick={() => toggleDescription(job.job_id)} className="text-accent text-[10px] md:text-[11px] font-black uppercase mt-4 hover:text-accent-hover transition-all flex items-center gap-2">
                  {isExpanded ? "↑ Collapse Details" : "↓ Expand Full Description"}
                </button>
              )}
            </div>

            <div className="pt-4 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-custom">
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-[9px] font-black text-muted uppercase tracking-widest">Client Spent:</span>
                <span className="text-[10px] font-bold text-secondary">{job.client_spent}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button onClick={() => setSelectedJob(job)} className="bg-secondary-accent hover:bg-secondary-accent-hover text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-xs md:text-sm font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-center">Generate Proposal ✨</button>
                <a href={job.job_url} target="_blank" className="bg-surface-light hover:bg-border text-primary px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-xs md:text-sm font-black transition-all active:scale-95 uppercase tracking-widest text-center">Apply on Upwork</a>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased text-[14px] overflow-x-hidden">
      {selectedJob && <ProposalModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      <Sidebar isSyncing={isSyncing} />

      <main className="flex-1 w-full p-4 pt-24 lg:pt-12 lg:ml-72 lg:p-12 overflow-x-hidden">
        <div className="mx-auto max-w-5xl w-full">
          <header className="mb-8 md:mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-1 w-10 bg-accent rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Upwork Jobs</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight leading-none break-words">Recent Feed</h1>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-3 md:gap-4 bg-surface p-2 md:p-3 rounded-[2rem] md:rounded-[2.5rem] border border-custom shadow-2xl">
                <div className="px-4 md:px-8 py-2 text-center border-r border-custom">
                  <p className="text-2xl md:text-3xl font-black text-primary leading-none">{jobs.length}</p>
                  <p className="text-[8px] md:text-[10px] font-bold uppercase text-muted mt-2 tracking-widest">Jobs Found</p>
                </div>
                <button onClick={() => fetchJobs()} className="p-3 md:p-4 hover:bg-surface-light rounded-full transition-all active:scale-90 group">
                  <svg className={`h-5 w-5 md:h-6 md:w-6 text-secondary group-hover:text-accent ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {/* Clear All Button */}
              <button
                onClick={handleClearAll}
                disabled={isClearing || jobs.length === 0}
                className="bg-danger/10 hover:bg-danger text-danger hover:text-white p-3 md:p-4 rounded-full transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-danger/10 disabled:hover:text-danger"
                title="Clear All Jobs"
              >
                <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </header>

          <div className="space-y-6 md:space-y-8 w-full">
            {renderContent()}
          </div>

          {totalPages > 1 && !isWaitingForNewJobs && (
            <div className="mt-12 md:mt-20 flex items-center justify-center gap-3 md:gap-4 pb-10 md:pb-20">
              <button disabled={currentPage === 1} onClick={() => {setCurrentPage(currentPage - 1); window.scrollTo({top:0, behavior:'smooth'})}} className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl border border-custom bg-surface text-secondary hover:border-accent transition-all disabled:opacity-10">
                <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="px-4 md:px-10 h-10 md:h-14 flex items-center rounded-xl md:rounded-2xl border border-custom bg-surface text-[10px] md:text-xs font-black text-secondary uppercase tracking-widest">
                Page <span className="text-primary mx-2 text-sm md:text-lg">{currentPage}</span> of {totalPages}
              </div>
              <button disabled={currentPage === totalPages} onClick={() => {setCurrentPage(currentPage + 1); window.scrollTo({top:0, behavior:'smooth'})}} className="h-10 w-10 md:h-14 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl border border-custom bg-surface text-secondary hover:border-accent transition-all disabled:opacity-10">
                <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}