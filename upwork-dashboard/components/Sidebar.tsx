// components/Sidebar.tsx

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
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const defaultTheme = prefersDark ? "dark" : "light";
      setTheme(defaultTheme);
      document.documentElement.setAttribute("data-theme", defaultTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

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

  const menuItems = [
    { name: "Dashboard", href: "/", icon: "M4 6h16M4 12h16M4 18h16" },
    { name: "My Portfolio", href: "/projects", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "History", href: "/history", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: "Proposal Format", href: "/format", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { name: "Batches", href: "/batches", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "Set Timer", href: "/timer", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-custom z-40 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-accent shadow-lg">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-lg font-black tracking-tighter uppercase text-primary">Job<span className="text-accent">Pulse</span></span>
        </div>
        <button onClick={() => setIsOpen(true)} className="text-secondary hover:text-primary p-2">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Aside */}
      <aside className={`fixed left-0 top-0 h-screen w-72 flex-col border-r border-custom bg-surface flex shadow-2xl z-[70] transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* CLOSE BUTTON */}
        <button 
          onClick={() => setIsOpen(false)} 
          className="lg:hidden absolute top-6 right-6 text-secondary hover:text-primary p-2 bg-surface-light rounded-xl transition-colors"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Login Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-surface border border-custom w-full max-w-md rounded-[2rem] p-6 md:p-10 shadow-2xl">
              <h2 className="text-2xl font-black text-primary mb-2">Connect Upwork</h2>
              <p className="text-secondary text-xs mb-8 uppercase tracking-widest font-bold">Remote Scraper Authorization</p>
              <div className="space-y-4">
                <input 
                  type="email" placeholder="Upwork Email" 
                  className="w-full bg-surface-light border border-custom rounded-2xl p-4 outline-none focus:border-accent text-primary transition-all"
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                />
                <input 
                  type="password" placeholder="Password" 
                  className="w-full bg-surface-light border border-custom rounded-2xl p-4 outline-none focus:border-accent text-primary transition-all"
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
                <button onClick={handleConnect} className="w-full bg-accent py-4 rounded-2xl font-black hover:bg-accent-hover transition-all shadow-lg">AUTHORIZE & CONNECT</button>
                <button onClick={() => setShowModal(false)} className="w-full text-secondary text-xs font-bold py-2 hover:text-primary transition-colors">CANCEL</button>
              </div>
            </div>
          </div>
        )}

        {/* Logo Section */}
        <div className="flex h-24 items-center gap-4 px-8 border-b border-custom">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent shadow-lg rotate-3">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase text-primary">Job<span className="text-accent">Pulse</span></span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition-all ${
                  isActive 
                  ? "bg-accent/10 text-accent border border-accent/20 shadow-inner" 
                  : "text-secondary hover:bg-surface-light hover:text-primary"
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

        <div className="p-6 border-t border-custom space-y-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-3 bg-surface-light hover:bg-border py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-secondary hover:text-accent"
          >
            {theme === "dark" ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light Mode
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark Mode
              </>
            )}
          </button>

          {auth.isConnected ? (
            <div className="space-y-3">
              <div className="bg-accent/5 border border-accent/20 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">Active Session</p>
                <p className="text-xs font-bold text-primary truncate">{auth.email}</p>
              </div>
              <button 
                onClick={handleDisconnect} 
                className="w-full bg-danger/10 text-danger py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-danger hover:text-white transition-all"
              >
                Terminate Connection
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowModal(true)} 
              className="w-full bg-accent text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-all shadow-xl"
            >
              Connect Upwork
            </button>
          )}

          <div className="flex items-center justify-center gap-2 pt-2">
            <div className={`h-1.5 w-1.5 rounded-full ${isSyncing ? 'bg-warning animate-pulse' : 'bg-success'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted">
              {isSyncing ? 'Syncing Engine' : 'Engine Stable'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}