import React from 'react';
import { Search } from 'lucide-react';

const SmartSearch: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">智能搜索 <span className="text-violet-600">Smart Search</span></h1>
          <p className="text-slate-600 mt-2 font-medium">智能搜索产品信息和解决方案 Smart search for product information.</p>
        </div>
      </div>

      <div className="glass-card p-12 rounded-[4rem] border border-slate-200 text-center">
        <div className="w-20 h-20 bg-violet-500/20 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-4">智能搜索功能</h2>
        <p className="text-slate-600">智能搜索功能正在开发中...</p>
      </div>
    </div>
  );
};

export default SmartSearch;