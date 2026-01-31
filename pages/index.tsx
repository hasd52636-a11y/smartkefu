import { useState, useEffect } from 'react';
import { ProductProject } from '../types';
import Dashboard from '../components/Dashboard';
import ProjectList from '../components/ProjectList';
import ProjectDetail from '../components/ProjectDetail';
import Analytics from '../components/Analytics';
import Settings from '../components/Settings';
import KnowledgeBase from '../components/KnowledgeBase';
import SmartSearch from '../components/SmartSearch';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon, 
  Search, 
  Bell, 
  User,
  BookOpen,
  MessageSquare
} from 'lucide-react';

// 模拟项目数据
const mockProjects: ProductProject[] = [
  {
    id: 'p1',
    name: '测试项目',
    description: '用于测试扫码功能的项目。',
    status: 'active' as any,
    config: {
      provider: 'zhipu' as any,
      voiceName: 'tongtong',
      visionEnabled: true,
      visionPrompt: '请分析安装照片，检查产品安装是否正确。',
      systemInstruction: '您是专业的产品技术支持专家。',
      videoGuides: [],
      multimodalEnabled: true,
      videoChatEnabled: true,
      videoChatPrompt: '您是专业技术支持专家。',
      avatarEnabled: true,
      annotationEnabled: true
    },
    knowledgeBase: [
      { 
        id: 'k1', 
        title: '使用说明', 
        type: 'text' as any, 
        content: '这是一个测试项目，用于验证扫码功能是否正常工作。', 
        createdAt: new Date().toISOString() 
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const Sidebar = ({ projects }: { projects: ProductProject[] }) => {
  return (
    <div className="w-72 glass-card flex flex-col h-screen sticky top-0 z-20">
      <div className="p-8">
        <div className="flex items-center gap-3 text-violet-600 font-black text-2xl tracking-tight">
          <div className="purple-gradient-btn p-2 rounded-2xl text-white shadow-lg gold-border-glow">
            <MessageSquare size={24} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-slate-800">AI虚拟客服</span>
            <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em] mt-1">AI Service</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <SidebarLink href="/" icon={<LayoutDashboard size={20} />} labelEn="Dashboard" labelZh="控制面板" />
        <SidebarLink href="/projects" icon={<Package size={20} />} labelEn="Products" labelZh="产品管理" />
        <SidebarLink href="/analytics" icon={<BarChart3 size={20} />} labelEn="Analytics" labelZh="数据分析" />
        <SidebarLink href="/settings" icon={<SettingsIcon size={20} />} labelEn="API Settings" labelZh="API设置" />
        <div className="px-5 py-2 mt-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">内容管理</span>
        </div>
        <SidebarLink href="/knowledge" icon={<BookOpen size={20} />} labelEn="Knowledge Base" labelZh="知识库" />
        <SidebarLink href="/search" icon={<Search size={20} />} labelEn="Smart Search" labelZh="智能搜索" />
      </nav>

      <div className="p-6 border-t border-slate-200">
        <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 group hover:border-amber-500/30 transition-all">
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center justify-between">
            PRO STATUS <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden p-[1px] border border-slate-200">
            <div className="purple-gradient-btn h-full" style={{ width: `${Math.min((projects.length / 20) * 100, 100)}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-black uppercase tracking-tighter">{projects.length} / 20 Projects 已用项目</p>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({ href, icon, labelEn, labelZh }: { href: string, icon: React.ReactNode, labelEn: string, labelZh: string }) => (
  <a 
    href={href} 
    className="flex items-center gap-4 px-5 py-4 text-slate-500 hover:bg-slate-100 hover:text-amber-500 rounded-2xl transition-all duration-500 group relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <span className="group-hover:scale-110 transition-transform z-10 group-hover:text-amber-500">{icon}</span>
    <div className="flex flex-col z-10">
      <span className="text-sm font-black tracking-wide text-slate-700 group-hover:text-amber-500 transition-colors uppercase">{labelZh}</span>
      <span className="text-[9px] opacity-50 uppercase font-black group-hover:opacity-100 group-hover:text-amber-600 transition-all">{labelEn}</span>
    </div>
  </a>
);

export default function Home() {
  const [projects, setProjects] = useState<ProductProject[]>(mockProjects);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const addProject = (name: string, description: string) => {
    const newProject: ProductProject = {
      id: `proj_${Date.now()}`,
      name,
      description,
      status: 'draft' as any,
      config: {
        provider: 'zhipu' as any,
        voiceName: 'tongtong',
        visionEnabled: true,
        visionPrompt: '请分析安装照片，检查产品安装是否正确。',
        systemInstruction: '您是专业的产品技术支持专家。',
        videoGuides: [],
        multimodalEnabled: true,
        videoChatEnabled: true,
        videoChatPrompt: '您是专业技术支持专家。',
        avatarEnabled: true,
        annotationEnabled: true
      },
      knowledgeBase: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProjects([...projects, newProject]);
  };

  const updateProject = (updated: ProductProject) => {
    setProjects(projects.map(p => p.id === updated.id ? updated : p));
  };

  const toggleProjectStatus = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      const updatedProject = {
        ...project,
        status: project.status === 'active' ? 'draft' : 'active' as any,
        updatedAt: new Date().toISOString()
      };
      updateProject(updatedProject);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar projects={projects} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-24 border-b border-slate-200 bg-white/80 flex items-center justify-between px-12 sticky top-0 z-10 backdrop-blur-2xl">
          <div className="flex items-center gap-4 bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl w-[450px] shadow-inner focus-within:border-amber-500/50 transition-all">
            <Search size={18} className="text-slate-500" />
            <input 
              type="text" 
              placeholder="搜索资产或向导 Search guide assets..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-500 font-medium"
            />
          </div>
          <div className="flex items-center gap-10">
            <button className="text-slate-500 hover:text-amber-500 transition-all relative">
              <Bell size={24} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full border-4 border-white shadow-lg"></span>
            </button>
            <div className="flex items-center gap-5 pl-10 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-black text-slate-700 leading-none uppercase tracking-wide">Alex Merchant</p>
                <p className="text-[10px] text-amber-500 uppercase font-black mt-2 tracking-[0.2em] opacity-80">PRO Admin</p>
              </div>
              <div className="w-12 h-12 rounded-2xl purple-gradient-btn gold-border-glow flex items-center justify-center text-white shadow-2xl">
                <User size={24} />
              </div>
            </div>
          </div>
        </header>

        <main className="p-12 pb-24">
          <Dashboard projects={projects} />
        </main>
      </div>
    </div>
  );
}