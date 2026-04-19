/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function ProfilePage() {
  const router = useRouter();
  const [auth, setAuth] = useState({ isConnected: false, email: "", connectedByMe: true });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showUpworkPassword, setShowUpworkPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ Listen to sidebar collapse events
  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
    return () => window.removeEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const fetchProfileData = async () => {
    setIsLoading(true);
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
      console.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
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
    await fetchProfileData();
    window.dispatchEvent(new Event('upwork-connection-change'));
    alert("Upwork Connected! 🚀");
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Upwork account? Scraper will stop running.")) return;
    const res = await fetch("/api/auth/upwork", { method: "DELETE" });
    if (res.ok) {
      await fetchProfileData();
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

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This will permanently delete your account, all settings, and all scraped jobs. This action cannot be undone.")) return;
    if (!confirm("Please confirm again: Delete my account and all data forever.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      alert("Your account has been deleted.");
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-page text-primary font-sans antialiased">
        <Sidebar />
        <main className="flex-1 lg:ml-72 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
            <p className="mt-4 text-muted uppercase tracking-widest text-sm">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased overflow-x-hidden">
      <Sidebar />
      <main className={`flex-1 w-full p-4 pt-24 lg:pt-12 overflow-x-hidden transition-all duration-500 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} lg:p-12`}>
        {/* ✅ Responsive container width */}
        <div className={`mx-auto w-full transition-all duration-500 ${sidebarCollapsed ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <header className="mb-8 md:mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1 w-10 bg-accent rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Account Settings</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight leading-none">Profile</h1>
          </header>

          <div className="space-y-6">
            {/* User Info Card */}
            <div className="bg-surface border border-custom rounded-[2rem] p-6 md:p-8">
              <h2 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account
              </h2>
              <div className="bg-surface-light p-4 rounded-xl">
                <p className="text-xs text-muted uppercase tracking-widest mb-1">Email Address</p>
                <p className="text-base font-bold text-primary break-all">{userEmail}</p>
              </div>
            </div>

            {/* Appearance Card */}
            <div className="bg-surface border border-custom rounded-[2rem] p-6 md:p-8">
              <h2 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Appearance
              </h2>
              <div className="flex items-center justify-between bg-surface-light p-4 rounded-xl">
                <span className="text-sm font-bold">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent font-bold text-sm hover:bg-accent hover:text-white transition-all"
                >
                  {theme === "dark" ? (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Switch to Light
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      Switch to Dark
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Upwork Integration Card */}
            <div className="bg-surface border border-custom rounded-[2rem] p-6 md:p-8">
              <h2 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upwork Integration
              </h2>
              {auth.isConnected ? (
                <div className="bg-surface-light p-4 rounded-xl space-y-4">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">Connected Account</p>
                    <p className="text-base font-bold text-primary break-all">{auth.email}</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full sm:w-auto bg-danger/10 hover:bg-danger text-danger hover:text-white py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Disconnect Upwork
                  </button>
                </div>
              ) : (
                <div className="bg-surface-light p-4 rounded-xl">
                  <p className="text-secondary text-sm mb-4">Connect your Upwork account to start scraping jobs.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-accent hover:bg-accent-hover text-white py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
                  >
                    Connect Upwork
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-surface border border-danger/30 rounded-[2rem] p-6 md:p-8">
              <h2 className="text-lg font-black text-danger mb-4 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h2>
              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto bg-surface-light hover:bg-border text-secondary py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Logout
                </button>
                <div className="border-t border-custom pt-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="w-full sm:w-auto bg-danger hover:bg-danger-hover text-white py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </button>
                  <p className="text-[10px] text-muted mt-2">This action cannot be undone.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              />
              <div className="relative">
                <input 
                  type={showUpworkPassword ? "text" : "password"}
                  placeholder="Password" 
                  className="w-full bg-surface-light border border-custom rounded-2xl p-4 pr-12 outline-none focus:border-accent text-primary transition-all"
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowUpworkPassword(!showUpworkPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-1"
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
    </div>
  );
}