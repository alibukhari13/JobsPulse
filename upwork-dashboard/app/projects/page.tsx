/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/context/ToastContext";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjects, setNewProjects] = useState([{ project_name: "", project_link: "", project_description: "" }]);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });
  const { showToast } = useToast();

  // ✅ Listen to sidebar collapse events
  useEffect(() => {
    const handleSidebarChange = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
    return () => window.removeEventListener('sidebar-collapsed-change', handleSidebarChange as EventListener);
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  };

  const addFormFields = () => {
    setNewProjects([...newProjects, { project_name: "", project_link: "", project_description: "" }]);
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const updated = [...newProjects];
    (updated[index] as any)[field] = value;
    setNewProjects(updated);
  };

  const saveNewProjects = async () => {
    const validProjects = newProjects.filter(p => p.project_name.trim());
    if (validProjects.length === 0) {
      showToast("Please enter at least one project name.", "warning");
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/projects", { method: "POST", body: JSON.stringify(validProjects) });
      setNewProjects([{ project_name: "", project_link: "", project_description: "" }]);
      fetchProjects();
      showToast("Portfolio Updated! 🚀", "success");
    } catch (err) {
      showToast("Failed to update portfolio", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async () => {
    setLoading(true);
    try {
      await fetch("/api/projects", { method: "POST", body: JSON.stringify(editingProject) });
      setEditingProject(null);
      fetchProjects();
      showToast("Project Updated! ✅", "success");
    } catch (err) {
      showToast("Failed to update project", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    fetchProjects();
    showToast("Project deleted", "info");
    setConfirmDelete({ isOpen: false, id: null });
  };

  const deleteProject = (id: number) => {
    setConfirmDelete({ isOpen: true, id });
  };

  return (
    <div className="flex min-h-screen bg-page text-primary font-sans antialiased text-[14px] overflow-x-hidden">
      {editingProject && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-custom w-full max-w-2xl rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-8">
            <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 text-primary">Edit Project</h2>
            <div className="space-y-4 md:space-y-6">
              <input className="w-full bg-surface-light border border-custom rounded-xl md:rounded-2xl p-4 outline-none focus:border-accent text-sm text-primary" value={editingProject.project_name} onChange={(e) => setEditingProject({...editingProject, project_name: e.target.value})} />
              <input className="w-full bg-surface-light border border-custom rounded-xl md:rounded-2xl p-4 outline-none focus:border-accent text-sm text-primary" value={editingProject.project_link} onChange={(e) => setEditingProject({...editingProject, project_link: e.target.value})} />
              <textarea className="w-full bg-surface-light border border-custom rounded-xl md:rounded-2xl p-4 h-32 md:h-40 outline-none focus:border-accent resize-none text-sm text-primary" value={editingProject.project_description} onChange={(e) => setEditingProject({...editingProject, project_description: e.target.value})} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8 md:mt-10">
              <button onClick={() => setEditingProject(null)} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-surface-light font-bold text-xs text-primary">Cancel</button>
              <button onClick={updateProject} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-accent font-black text-xs text-white">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <main className={`flex-1 w-full p-4 pt-24 lg:pt-12 overflow-x-hidden transition-all duration-500 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} lg:p-12`}>
        <div className={`mx-auto w-full transition-all duration-500 ${sidebarCollapsed ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <header className="mb-8 md:mb-12">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-accent">Asset Management</span>
            <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tighter leading-none mt-2 break-words">My Portfolio</h1>
          </header>

          <section className="bg-surface border border-custom p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-xl mb-12 md:mb-16 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-accent">Add New Projects</h2>
              <button onClick={addFormFields} className="bg-surface-light hover:bg-border px-5 md:px-6 py-2 rounded-xl text-[10px] font-black transition-all w-full sm:w-auto text-primary">+ ADD ROW</button>
            </div>
            <div className="space-y-4 md:space-y-6">
              {newProjects.map((p, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-5 md:p-8 bg-surface-light rounded-[1.5rem] md:rounded-[2rem] border border-custom">
                  <input placeholder="Project Name" className="bg-transparent border-b border-custom p-2 md:p-3 outline-none focus:border-accent text-base md:text-lg font-bold text-primary" value={p.project_name} onChange={(e) => handleInputChange(i, "project_name", e.target.value)} />
                  <input placeholder="Live Link (URL)" className="bg-transparent border-b border-custom p-2 md:p-3 outline-none focus:border-accent text-xs md:text-sm text-secondary" value={p.project_link} onChange={(e) => handleInputChange(i, "project_link", e.target.value)} />
                  <textarea placeholder="Description..." className="md:col-span-2 bg-transparent border-b border-custom p-2 md:p-3 outline-none focus:border-accent h-20 md:h-24 resize-none text-xs md:text-sm text-secondary" value={p.project_description} onChange={(e) => handleInputChange(i, "project_description", e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={saveNewProjects} disabled={loading} className="w-full mt-8 md:mt-10 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] bg-accent text-white font-black hover:bg-accent-hover transition-all shadow-xl uppercase tracking-[0.2em] text-xs md:text-sm">{loading ? "Syncing..." : "Save to Portfolio"}</button>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
            {projects.map(p => (
              <div key={p.id} className="group bg-surface border border-custom p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] relative transition-all hover:border-accent/30 shadow-xl w-full">
                <div className="flex justify-between items-start mb-4 md:mb-6 gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-primary leading-tight break-words">{p.project_name}</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setEditingProject(p)} className="p-2 md:p-3 bg-accent/10 text-accent rounded-xl hover:bg-accent hover:text-white transition-all"><svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => deleteProject(p.id)} className="p-2 md:p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all"><svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <a href={p.project_link} target="_blank" className="text-accent text-[10px] md:text-xs font-black tracking-widest hover:text-accent-hover mb-4 md:mb-6 block truncate uppercase border-b border-accent/10 pb-2 w-fit max-w-full">{p.project_link || "No Link"}</a>
                <p className="text-secondary text-xs md:text-sm leading-relaxed italic line-clamp-4 break-words">{p.project_description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  );
}