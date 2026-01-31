
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ProductProject, ProjectStatus } from '../types';
import { 
  Plus, 
  MoreVertical, 
  Search, 
  Package, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Power,
  PowerOff,
  Trash2
} from 'lucide-react';

interface ProjectListProps {
  projects: ProductProject[];
  onAdd: (name: string, description: string) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onAdd, onToggleStatus, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  const handleAdd = () => {
    if (newName) {
      onAdd(newName, newDesc);
      setShowModal(false);
      setNewName('');
      setNewDesc('');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">产品中心 <span className="text-violet-600">Products</span></h1>
          <p className="text-slate-600 mt-2 font-medium">管理与配置您的智能引导项目 Manage your AI guides.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="purple-gradient-btn text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95"
        >
          <Plus size={22} />
          Create New 新建项目
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects.map(project => (
          <div 
            key={project.id} 
            className="glass-card rounded-[2.5rem] border border-slate-200 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
            onClick={(e) => {
              // 只有当点击的不是按钮时才导航
              if (!(e.target as HTMLElement).closest('button')) {
                navigate(`/projects/${project.id}`);
              }
            }}
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/10 blur-[60px]"></div>
            
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-slate-100 text-violet-600 rounded-3xl flex items-center justify-center border border-slate-200 group-hover:bg-violet-500 group-hover:text-white transition-all group-hover:rotate-6 shadow-xl">
                  <Package size={32} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest ${
                    project.status === ProjectStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {project.status === 'active' ? 'Active 在线' : 'Draft 草稿'}
                  </span>
                  
                  {/* 产品控制按钮组 */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10">
                    {/* 启用/关闭按钮 */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Toggle status clicked for project:', project.id);
                        onToggleStatus(project.id);
                      }}
                      className={`p-2 rounded-xl transition-all relative z-20 ${
                        project.status === ProjectStatus.ACTIVE 
                          ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white' 
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                      }`}
                      title={project.status === ProjectStatus.ACTIVE ? '关闭产品' : '启用产品'}
                    >
                      {project.status === ProjectStatus.ACTIVE ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    
                    {/* 删除按钮 */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Delete clicked for project:', project.id);
                        if (window.confirm(`确定要删除产品 "${project.name}" 吗？此操作不可撤销。`)) {
                          onDelete(project.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all relative z-20"
                      title="删除产品"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-violet-600 transition-colors">{project.name}</h3>
              <p className="text-slate-600 text-sm font-medium line-clamp-2 mb-8 leading-relaxed">{project.description}</p>
              
              <div className="flex items-center gap-6 py-5 border-t border-slate-200">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Knowledge</p>
                  <p className="text-sm font-bold text-slate-800">{project.knowledgeBase.length} Items 条目</p>
                </div>
                <div className="flex-1 border-l border-slate-200 pl-6">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Analysis</p>
                  <p className="text-sm font-bold text-slate-800">1.2k Scans 次</p>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 bg-slate-100 flex items-center justify-between text-slate-700 group-hover:text-violet-600 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                Configure Settings 配置设置 <ChevronRight size={14} />
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`#/view/${project.id}`, '_blank');
                }}
                className="p-2.5 bg-slate-200 hover:bg-violet-500 rounded-xl transition-all text-slate-600 hover:text-white shadow-lg"
              >
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-slate-800 mb-2">新建项目 <span className="text-violet-600">New Guide</span></h2>
            <p className="text-slate-600 mb-8 font-medium">Create a dedicated interactive project.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2.5">Product Name 产品名称</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SmartHome Hub"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 outline-none focus:border-violet-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2.5">Description 产品描述</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this product?"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 outline-none focus:border-violet-500 transition-all h-32 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-slate-600 font-bold uppercase text-xs tracking-widest hover:text-slate-900 transition-colors"
              >
                Cancel 取消
              </button>
              <button 
                onClick={handleAdd}
                className="flex-1 py-4 purple-gradient-btn text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95"
              >
                Create Project 创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
