/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { useToast } from "@/context/ToastContext";

export default function ProposalModal({ job, onClose }: { job: any, onClose: () => void }) {
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const generateAI = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const data = await res.json();
      setProposal(data.proposal);
    } catch (err) {
      showToast("AI Generation Failed!", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async () => {
    if (!proposal) return;
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        jobId: job.job_id, 
        jobTitle: job.job_title, 
        proposalText: proposal 
      }),
    });
    if (res.ok) {
      showToast("Proposal Saved & Agent Trained! ✅", "success");
      onClose();
    } else {
      showToast("Failed to save proposal", "error");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    showToast("Copied to clipboard!", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-page/95 backdrop-blur-xl z-[100] flex items-center justify-center p-2 md:p-8 animate-in fade-in duration-300 overflow-hidden">
      
      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: var(--color-accent); border-radius: 20px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-accent-hover); }
      `}</style>

      <div className="bg-surface border border-custom w-full max-w-6xl rounded-[1.5rem] md:rounded-[3rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[95vh] md:max-h-[90vh]">
        
        <div className="lg:w-1/3 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-custom bg-surface-light overflow-y-auto custom-scroll">
          <button onClick={onClose} className="mb-6 text-muted hover:text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors">✕ Close</button>
          
          <h2 className="text-xl md:text-2xl font-black text-primary mb-6 leading-tight break-words">{job.job_title}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-accent font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.job_tags?.split(',').map((tag: string, i: number) => (
                  <span key={i} className="bg-accent/10 text-accent text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 rounded-lg border border-accent/20 max-w-full truncate">{tag.trim()}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-secondary-accent font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-2">Client & Job Info</h3>
              <div className="grid grid-cols-1 gap-3 text-[11px] md:text-[12px]">
                <div className="text-secondary flex justify-between border-b border-custom pb-1">Location: <span className="text-primary font-bold truncate ml-2">{job.client_location}</span></div>
                <div className="text-secondary flex justify-between border-b border-custom pb-1">Total Spent: <span className="text-primary font-bold truncate ml-2">{job.client_spent}</span></div>
                <div className="text-secondary flex justify-between border-b border-custom pb-1">Payment: <span className="text-accent font-bold uppercase truncate ml-2">{job.is_verified}</span></div>
                <div className="text-secondary flex justify-between border-b border-custom pb-1">Budget: <span className="text-accent font-bold truncate ml-2">{job.budget}</span></div>
              </div>
            </div>

            <div>
              <h3 className="text-muted font-black text-[9px] md:text-[10px] uppercase tracking-widest mb-2">Description</h3>
              <p className="text-secondary text-xs md:text-sm leading-relaxed whitespace-pre-wrap italic break-words">{job.job_description}</p>
            </div>
          </div>
        </div>

        <div className="lg:w-2/3 p-6 md:p-12 flex flex-col bg-surface overflow-y-auto custom-scroll">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-primary font-black text-xl md:text-2xl tracking-tight">AI Proposal Editor</h3>
              <p className="text-secondary text-[10px] md:text-xs font-medium italic">Focusing on: {job.job_tags?.split(',').slice(0,3).join(', ')}...</p>
            </div>
            {proposal && (
              <button onClick={copyToClipboard} className={`text-[9px] md:text-[10px] font-black px-4 md:px-5 py-2 rounded-xl transition-all w-full sm:w-auto ${copied ? 'bg-accent text-white' : 'bg-surface-light text-secondary hover:bg-border'}`}>
                {copied ? "COPIED! ✅" : "COPY TEXT"}
              </button>
            )}
          </div>

          <div className="relative flex-1 min-h-[300px]">
            <textarea 
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="custom-scroll w-full h-full min-h-[300px] bg-surface-light border border-custom rounded-[1rem] md:rounded-[2.5rem] p-6 md:p-10 text-primary text-sm md:text-base leading-relaxed focus:border-accent outline-none transition-all resize-none shadow-inner overflow-y-auto"
              placeholder="AI will craft a skill-focused proposal here..."
            />
            {loading && (
              <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[1rem] md:rounded-[2.5rem] z-10">
                <div className="w-10 h-10 md:w-14 md:h-14 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-accent font-black text-[10px] md:text-xs uppercase tracking-[0.2em] animate-pulse">AI is analyzing skills...</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button onClick={generateAI} disabled={loading} className="flex-[2] bg-secondary-accent hover:bg-secondary-accent-hover text-white font-black py-4 md:py-5 rounded-xl md:rounded-[1.5rem] transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 text-xs md:text-sm">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {proposal ? "REGENERATE ✨" : "GENERATE PROPOSAL ✨"}
            </button>
            <button onClick={saveToHistory} disabled={!proposal || loading} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-20 text-white font-black py-4 md:py-5 rounded-xl md:rounded-[1.5rem] transition-all active:scale-95 shadow-xl text-xs md:text-sm">
              SAVE & TRAIN 🤖
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}