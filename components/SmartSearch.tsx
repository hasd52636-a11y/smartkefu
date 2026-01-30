import React, { useState, useRef } from 'react';
import { Search, Loader2, BookOpen, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { aiService } from '../services/aiService';
import { ZhipuModel } from '../services/aiService';

interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  source: string;
}

interface ProcessedDocument extends SearchableDocument {
  embedding?: number[];
}

interface SearchResult {
  doc: ProcessedDocument;
  score: number;
}

const SmartSearch: React.FC = () => {
  const [documents, setDocuments] = useState<SearchableDocument[]>([
    {
      id: '1',
      title: '产品使用说明',
      content: '本产品是一款智能语音助手，支持语音控制、智能家居管理、信息查询等功能。使用前请确保设备已连接电源并完成初始化设置。',
      source: '产品手册'
    },
    {
      id: '2',
      title: '常见问题解答',
      content: 'Q: 设备无法连接网络怎么办？A: 请检查网络连接是否正常，尝试重启设备或重新配置网络设置。Q: 如何更新设备固件？A: 进入设置界面，选择系统更新，按照提示完成更新。',
      source: 'FAQ'
    },
    {
      id: '3',
      title: '安全使用指南',
      content: '使用本产品时，请遵守以下安全规则：1. 请勿在潮湿环境中使用 2. 请勿摔打或撞击设备 3. 请使用原装电源适配器 4. 儿童使用时需成人监护。',
      source: '安全手册'
    }
  ]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: 'info' as 'info' | 'success' | 'error', text: '' });

  const showMessage = (type: 'info' | 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: 'info', text: '' }), 3000);
  };

  const processDocuments = async () => {
    try {
      setIsProcessing(true);
      showMessage('info', '正在处理文档...');

      const processed = await Promise.all(
        documents.map(async (doc) => {
          const embedding = await aiService.createEmbedding(doc.content, {
            model: ZhipuModel.EMBEDDING_3,
            dimensions: 768
          });
          return {
            ...doc,
            embedding: embedding.data[0].embedding
          };
        })
      );

      setProcessedDocuments(processed);
      showMessage('success', '文档处理完成！');
    } catch (error) {
      console.error('文档处理失败:', error);
      showMessage('error', '文档处理失败，请检查API密钥是否正确');
    } finally {
      setIsProcessing(false);
    }
  };

  const searchDocuments = async () => {
    if (!searchQuery.trim()) {
      showMessage('info', '请输入搜索关键词');
      return;
    }

    try {
      setIsSearching(true);
      showMessage('info', '正在搜索...');

      const queryEmbedding = await aiService.createEmbedding(searchQuery, {
        model: ZhipuModel.EMBEDDING_3,
        dimensions: 768
      });

      const results = processedDocuments
        .map(doc => ({
          doc,
          score: aiService.cosineSimilarity(
            queryEmbedding.data[0].embedding,
            doc.embedding!
          )
        }))
        .filter(result => result.score > 0.1)
        .sort((a, b) => b.score - a.score);

      setSearchResults(results);
      showMessage('success', `找到 ${results.length} 个相关文档`);
    } catch (error) {
      console.error('搜索失败:', error);
      showMessage('error', '搜索失败，请检查API连接');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-6">
      {/* 头部 */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center">
            <Search size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">智能语义搜索</h1>
            <p className="text-slate-400 text-sm">基于向量模型的智能文档搜索</p>
          </div>
        </div>

        {/* 消息提示 */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-4 flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-900/30 text-green-400' :
            message.type === 'error' ? 'bg-red-900/30 text-red-400' :
            'bg-blue-900/30 text-blue-400'
          }`}>
            {message.type === 'success' && <CheckCircle size={18} />}
            {message.type === 'error' && <AlertCircle size={18} />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文档管理 */}
        <div className="lg:col-span-1">
          <div className="bg-[#0f1218] rounded-xl p-6 border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={20} className="text-violet-400" />
                文档管理
              </h2>
              <button
                onClick={processDocuments}
                disabled={isProcessing || processedDocuments.length > 0}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors disabled:bg-gray-600"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    处理中...
                  </div>
                ) : processedDocuments.length > 0 ? (
                  '已处理'
                ) : (
                  '处理文档'
                )}
              </button>
            </div>

            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-sm">{doc.title}</h3>
                    <span className="text-xs bg-violet-900/50 text-violet-300 px-2 py-1 rounded">
                      {doc.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {doc.content}
                  </p>
                  {processedDocuments.find(p => p.id === doc.id)?.embedding && (
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-xs text-slate-500">已向量化</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：搜索界面 */}
        <div className="lg:col-span-2">
          <div className="bg-[#0f1218] rounded-xl p-6 border border-white/5 h-full">
            <div className="mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Search size={20} className="text-violet-400" />
                智能搜索
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入搜索关键词..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  onClick={searchDocuments}
                  disabled={isSearching || processedDocuments.length === 0}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:bg-gray-600"
                >
                  {isSearching ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      搜索中
                    </div>
                  ) : (
                    '搜索'
                  )}
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-4">搜索结果</h3>
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={result.doc.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{result.doc.title}</h4>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-violet-400 font-mono">
                            {Math.round(result.score * 100)}%
                          </span>
                          {result.score > 0.7 && (
                            <CheckCircle size={14} className="text-green-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                        {result.doc.content}
                      </p>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs text-slate-500">来源: {result.doc.source}</span>
                        <div className="flex gap-2">
                          <button className="text-xs text-violet-400 hover:text-violet-300">
                            查看详情
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Search size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">
                    {processedDocuments.length === 0
                      ? '请先处理文档'
                      : '暂无搜索结果，请输入关键词搜索'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSearch;