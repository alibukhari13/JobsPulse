/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AuthStatus {
  isConnected: boolean;
  email: string | null;
  connectedByMe: boolean;
}

export default function Sidebar({ isSyncing = false }: { isSyncing?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<AuthStatus>({ isConnected: false, email: "", connectedByMe: false });
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showUpworkPassword, setShowUpworkPassword] = useState(false);

  // 监听来自仪表板的打开模态框请求
  useEffect(() => {
    const handleOpenModal = () => setShowModal(true);
    window.addEventListener('open-upwork-modal', handleOpenModal);
    return () => window.removeEventListener('open-upwork-modal', handleOpenModal);
  }, []);

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { isCollapsed } }));
  }, [isCollapsed]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const checkAuth = async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setUserEmail(sessionData.user?.email || null);
      }

      const res = await fetch("/api/auth/upwork");
      const data = await res.json();
      setAuth(data);
    } catch (err) {
      console.error("Auth check failed");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleConnect = async () => {
    if (!credentials.email || !credentials.password) return alert("Please fill all fields");
    const res = await fetch("/api/auth/upwork", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Connection failed");
      return;
    }
    setShowModal(false);
    setCredentials({ email: "", password: "" });
    await checkAuth();
    window.dispatchEvent(new Event('upwork-connection-change'));
    alert("Upwork Connected! Scraper is now authorized. 🚀");
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Upwork account? Scraper will stop running.")) return;
    const res = await fetch("/api/auth/upwork", { method: "DELETE" });
    if (res.ok) {
      await checkAuth();
      window.dispatchEvent(new Event('upwork-connection-change'));
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { name: "Dashboard", href: "/", icon: "M4 6h16M4 12h16M4 18h16" },
    { name: "My Portfolio", href: "/projects", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "History", href: "/history", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: "Proposal Format", href: "/format", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { name: "Batches", href: "/batches", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    { name: "Set Timer", href: "/timer", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { name: "Profile", href: "/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  return (
    <>
      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-custom z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-accent shadow-lg">
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tighter uppercase text-primary">Job<span className="text-accent">Pulse</span></span>
        </div>
        <button onClick={() => setIsOpen(true)} className="text-secondary hover:text-primary p-2">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-surface border-r border-custom flex flex-col shadow-2xl z-[70] transition-all duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'} 
        ${isCollapsed ? 'w-20' : 'w-72'}`}
      >
        {/* Header Section */}
        <div className={`flex items-center transition-all duration-500 py-8 ${isCollapsed ? 'px-0 justify-center' : 'px-6 justify-between'}`}>
          <div 
            onClick={() => isCollapsed && setIsCollapsed(false)}
            className={`flex items-center gap-3 transition-all duration-500 ${isCollapsed ? 'cursor-pointer' : ''}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent shadow-lg rotate-3 flex-shrink-0">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className={`text-2xl font-black tracking-tighter uppercase text-primary transition-all duration-500 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              Job<span className="text-accent">Pulse</span>
            </span>
          </div>
          
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-muted hover:text-primary transition-all p-1.5 hover:bg-surface-light rounded-md"
              title="Collapse Sidebar"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 space-y-1 transition-all duration-500 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center rounded-xl transition-all duration-300 group relative
                  ${isCollapsed ? 'justify-center px-0 py-3' : 'justify-start px-4 py-3'}
                  ${isActive 
                    ? "bg-accent/10 text-accent border border-accent/20" 
                    : "text-secondary hover:bg-surface-light hover:text-primary"}`}
              >
                <svg className={`h-5 w-5 flex-shrink-0 transition-colors duration-300 ${isActive ? "text-accent" : "text-muted group-hover:text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className={`font-bold text-sm transition-all duration-500 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}>
                  {item.name}
                </span>

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface border border-custom text-primary text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 whitespace-nowrap shadow-xl">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status Section */}
        <div className={`p-4 border-t border-custom transition-all duration-500 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 transition-all duration-500 ${isCollapsed ? '' : 'px-2'}`}>
            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isSyncing ? 'bg-warning animate-pulse' : 'bg-success'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest text-muted transition-all duration-500 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              {isSyncing ? 'Syncing Engine' : 'Engine Stable'}
            </span>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface border border-custom text-primary text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 whitespace-nowrap shadow-xl">
                {isSyncing ? 'Syncing Engine' : 'Engine Stable'}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Connect Upwork Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-custom w-full max-w-md rounded-[2rem] p-6 md:p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-primary mb-2">Connect Upwork</h2>
            <p className="text-secondary text-xs mb-6 uppercase tracking-widest font-bold">Remote Scraper Authorization</p>
            <div className="space-y-4">
              <input 
                type="email" 
                placeholder="Upwork Email" 
                className="w-full bg-surface-light border border-custom rounded-2xl p-4 outline-none focus:border-accent text-primary transition-all"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              />
              <div className="relative">
                <input 
                  type={showUpworkPassword ? "text" : "password"}
                  placeholder="Password" 
                  className="w-full bg-surface-light border border-custom rounded-2xl p-4 pr-12 outline-none focus:border-accent text-primary transition-all"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowUpworkPassword(!showUpworkPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-1"
                  aria-label={showUpworkPassword ? "Hide password" : "Show password"}
                >
                  {showUpworkPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <button onClick={handleConnect} className="w-full bg-accent py-4 rounded-2xl font-black hover:bg-accent-hover transition-all shadow-lg">AUTHORIZE & CONNECT</button>
              <button onClick={() => setShowModal(false)} className="w-full text-secondary text-xs font-bold py-2 hover:text-primary transition-colors">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-accent); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-accent-hover); }
      `}</style>
    </>
  );
}