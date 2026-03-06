/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ isSyncing = false }: { isSyncing?: boolean }) {
  const pathname = usePathname();
  const [auth, setAuth] = useState({ isConnected: false, email: "" });
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/upwork");
      const data = await res.json();
      setAuth(data);
    } catch (err) {
      console.error("Auth check failed");
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const handleConnect = async () => {
    if (!credentials.email || !credentials.password) return alert("Please fill all fields");
    await fetch("/api/auth/upwork", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setShowModal(false);
    checkAuth();
    alert("Upwork Connected! Scraper is now authorized. 🚀");
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Upwork account? Scraper will stop running.")) return;
    await fetch("/api/auth/upwork", { method: "DELETE" });
    checkAuth();
  };

  // --- SARE MENUS YAHAN HAIN ---
  const menuItems = [
    { name: "Dashboard", href: "/", icon: "M4 6h16M4 12h16M4 18h16" },
    { name: "My Portfolio", href: "/projects", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "History", href: "/history", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: "Proposal Format", href: "/format", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { name: "Batches", href: "/settings", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "Set Timer", href: "/timer", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-800/60 bg-[#0B1120] lg:flex shadow-2xl z-40">
      
      {/* Login Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-slate-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-2">Connect Upwork</h2>
            <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest font-bold">Remote Scraper Authorization</p>
            <div className="space-y-4">
              <input 
                type="email" placeholder="Upwork Email" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 outline-none focus:border-emerald-500 text-white transition-all"
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              />
              <input 
                type="password" placeholder="Password" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 outline-none focus:border-emerald-500 text-white transition-all"
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
              <button onClick={handleConnect} className="w-full bg-emerald-600 py-4 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">AUTHORIZE & CONNECT</button>
              <button onClick={() => setShowModal(false)} className="w-full text-slate-500 text-xs font-bold py-2 hover:text-slate-300 transition-colors">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Logo Section */}
      <div className="flex h-24 items-center gap-4 px-8 border-b border-slate-800/50">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg rotate-3">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-2xl font-black tracking-tighter uppercase text-white">Job<span className="text-emerald-500">Pulse</span></span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition-all ${
                isActive 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Auth Section */}
      <div className="p-6 border-t border-slate-800/50 space-y-4">
        {auth.isConnected ? (
          <div className="space-y-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Active Session</p>
              <p className="text-xs font-bold text-slate-300 truncate">{auth.email}</p>
            </div>
            <button 
              onClick={handleDisconnect} 
              className="w-full bg-red-500/10 text-red-500 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              Terminate Connection
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowModal(true)} 
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
          >
            Connect Upwork
          </button>
        )}

        {/* Sync Status Indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
            {isSyncing ? 'Syncing Engine' : 'Engine Stable'}
          </span>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </aside>
  );
}