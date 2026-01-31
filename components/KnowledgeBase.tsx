import React from 'react';
import { BookOpen } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">知识库管理 <span className="text-violet-600">Knowledge Base</span></h1>
          <p className="text-slate-600 mt-2 font-medium">管理产品知识库和文档 Manage product knowledge and documents.</p>
        </div>
      </div>

      <div className="glass-card p-12 rounded-[4rem] border border-slate-200 text-center">
        <div className="w-20 h-20 bg-violet-500/20 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-4">知识库功能</h2>
        <p className="text-slate-600">知识库管理功能正在开发中...</p>
      </div>
    </div>
  );
};

export default KnowledgeBase;