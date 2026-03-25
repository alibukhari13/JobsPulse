/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjects, setNewProjects] = useState([{ project_name: "", project_link: "", project_description: "" }]);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    if (validProjects.length === 0) return alert("Please enter at least one project name.");
    setLoading(true);
    await fetch("/api/projects", { method: "POST", body: JSON.stringify(validProjects) });
    setNewProjects([{ project_name: "", project_link: "", project_description: "" }]);
    fetchProjects();
    setLoading(false);
    alert("Portfolio Updated! 🚀");
  };

  const updateProject = async () => {
    setLoading(true);
    await fetch("/api/projects", { method: "POST", body: JSON.stringify(editingProject) });
    setEditingProject(null);
    fetchProjects();
    setLoading(false);
    alert("Project Updated! ✅");
  };

  const deleteProject = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    fetchProjects();
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans antialiased text-[14px] overflow-x-hidden">
      {editingProject && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0B1120] border border-slate-800 w-full max-w-2xl rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl my-8">
            <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 text-white">Edit Project</h2>
            <div className="space-y-4 md:space-y-6">
              <input className="w-full bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-4 outline-none focus:border-emerald-500 text-sm" value={editingProject.project_name} onChange={(e) => setEditingProject({...editingProject, project_name: e.target.value})} />
              <input className="w-full bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-4 outline-none focus:border-emerald-500 text-sm" value={editingProject.project_link} onChange={(e) => setEditingProject({...editingProject, project_link: e.target.value})} />
              <textarea className="w-full bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-4 h-32 md:h-40 outline-none focus:border-emerald-500 resize-none text-sm" value={editingProject.project_description} onChange={(e) => setEditingProject({...editingProject, project_description: e.target.value})} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8 md:mt-10">
              <button onClick={() => setEditingProject(null)} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-800 font-bold text-xs">Cancel</button>
              <button onClick={updateProject} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-emerald-600 font-black text-xs">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-4 pt-24 lg:pt-12 lg:ml-72 lg:p-12 overflow-x-hidden">
        <div className="mx-auto max-w-5xl w-full">
          <header className="mb-8 md:mb-12">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Asset Management</span>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mt-2 break-words">My Portfolio</h1>
          </header>

          <section className="bg-[#0B1120] border border-slate-800 p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] shadow-xl mb-12 md:mb-16 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold text-emerald-400">Add New Projects</h2>
              <button onClick={addFormFields} className="bg-slate-800 hover:bg-slate-700 px-5 md:px-6 py-2 rounded-xl text-[10px] font-black transition-all w-full sm:w-auto">+ ADD ROW</button>
            </div>
            <div className="space-y-4 md:space-y-6">
              {newProjects.map((p, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-5 md:p-8 bg-slate-900/40 rounded-[1.5rem] md:rounded-[2rem] border border-slate-800/50">
                  <input placeholder="Project Name" className="bg-transparent border-b border-slate-800 p-2 md:p-3 outline-none focus:border-emerald-500 text-base md:text-lg font-bold" value={p.project_name} onChange={(e) => handleInputChange(i, "project_name", e.target.value)} />
                  <input placeholder="Live Link (URL)" className="bg-transparent border-b border-slate-800 p-2 md:p-3 outline-none focus:border-emerald-500 text-xs md:text-sm text-slate-400" value={p.project_link} onChange={(e) => handleInputChange(i, "project_link", e.target.value)} />
                  <textarea placeholder="Description..." className="md:col-span-2 bg-transparent border-b border-slate-800 p-2 md:p-3 outline-none focus:border-emerald-500 h-20 md:h-24 resize-none text-xs md:text-sm text-slate-400" value={p.project_description} onChange={(e) => handleInputChange(i, "project_description", e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={saveNewProjects} disabled={loading} className="w-full mt-8 md:mt-10 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] bg-emerald-600 text-white font-black hover:bg-emerald-500 transition-all shadow-xl uppercase tracking-[0.2em] text-xs md:text-sm">{loading ? "Syncing..." : "Save to Portfolio"}</button>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
            {projects.map(p => (
              <div key={p.id} className="group bg-[#0B1120] border border-slate-800 p-6 md:p-10 rounded-[1.5rem] md:rounded-[3rem] relative transition-all hover:border-emerald-500/30 shadow-xl w-full">
                <div className="flex justify-between items-start mb-4 md:mb-6 gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight break-words">{p.project_name}</h3>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setEditingProject(p)} className="p-2 md:p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => deleteProject(p.id)} className="p-2 md:p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <a href={p.project_link} target="_blank" className="text-emerald-500 text-[10px] md:text-xs font-black tracking-widest hover:text-emerald-400 mb-4 md:mb-6 block truncate uppercase border-b border-emerald-500/10 pb-2 w-fit max-w-full">{p.project_link || "No Link"}</a>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed italic line-clamp-4 break-words">{p.project_description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}