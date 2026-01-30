import React, { useState, useRef, useEffect } from 'react';
import { Search, Upload, FileText, BookOpen, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { aiService } from '../services/aiService';
import { ZhipuModel } from '../services/aiService';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  createdAt: Date;
  vectorized: boolean;
}

interface SearchResult {
  doc: KnowledgeDocument;
  score: number;
}

const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({ title: '', content: '' });
  const [message, setMessage] = useState({ type: 'info' as 'info' | 'success' | 'error', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载示例文档
  useEffect(() => {
    const loadSampleDocuments = () => {
      const samples: KnowledgeDocument[] = [
        {
          id: '1',
          title: '产品使用说明',
          content: '本产品是一款智能语音助手，支持语音控制、智能家居管理、信息查询等功能。使用前请确保设备已连接电源并完成初始化设置。',
          createdAt: new Date(),
          vectorized: false
        },
        {
          id: '2',
          title: '常见问题解答',
          content: 'Q: 设备无法连接网络怎么办？A: 请检查网络连接是否正常，尝试重启设备或重新配置网络设置。Q: 如何更新设备固件？A: 进入设置界面，选择系统更新，按照提示完成更新。',
          createdAt: new Date(),
          vectorized: false
        },
        {
          id: '3',
          title: '故障排除指南',
          content: '如果设备出现故障，请按照以下步骤进行排查：1. 检查电源连接 2. 重启设备 3. 恢复出厂设置 4. 联系客服寻求帮助。',
          createdAt: new Date(),
          vectorized: false
        }
      ];
      setDocuments(samples);
    };

    loadSampleDocuments();
  }, []);

  // 显示消息
  const showMessage = (type: 'info' | 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: 'info', text: '' }), 3000);
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setNewDocument({
          title: file.name,
          content
        });
      };
      reader.readAsText(file);
    }
  };

  // 添加新文档
  const addDocument = async () => {
    if (!newDocument.title || !newDocument.content) {
      showMessage('error', '请填写文档标题和内容');
      return;
    }

    const doc: KnowledgeDocument = {
      id: Date.now().toString(),
      title: newDocument.title,
      content: newDocument.content,
      createdAt: new Date(),
      vectorized: false
    };

    setDocuments(prev => [...prev, doc]);
    setNewDocument({ title: '', content: '' });
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showMessage('success', '文档添加成功');
  };

  // 删除文档
  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    showMessage('success', '文档删除成功');
  };

  // 向量化单个文档
  const vectorizeDocument = async (doc: KnowledgeDocument) => {
    try {
      setIsVectorizing(true);
      
      const embeddingResult = await aiService.createEmbedding(doc.content, {
        model: ZhipuModel.EMBEDDING_3,
        dimensions: 768
      });

      setDocuments(prev => prev.map(d => 
        d.id === doc.id 
          ? { ...d, embedding: embeddingResult.data[0].embedding, vectorized: true }
          : d
      ));

      showMessage('success', `文档 "${doc.title}" 向量化成功`);
    } catch (error) {
      console.error('向量化失败:', error);
      showMessage('error', '文档向量化失败，请检查API密钥是否正确');
    } finally {
      setIsVectorizing(false);
    }
  };

  // 批量向量化所有文档
  const vectorizeAllDocuments = async () => {
    try {
      setIsVectorizing(true);
      
      const unvectorizedDocs = documents.filter(doc => !doc.vectorized);
      if (unvectorizedDocs.length === 0) {
        showMessage('info', '所有文档都已向量化');
        return;
      }

      const updatedDocs = [...documents];
      
      for (const doc of unvectorizedDocs) {
        const embeddingResult = await aiService.createEmbedding(doc.content, {
          model: ZhipuModel.EMBEDDING_3,
          dimensions: 768
        });
        
        const index = updatedDocs.findIndex(d => d.id === doc.id);
        if (index !== -1) {
          updatedDocs[index] = {
            ...updatedDocs[index],
            embedding: embeddingResult.data[0].embedding,
            vectorized: true
          };
        }
      }

      setDocuments(updatedDocs);
      showMessage('success', `成功向量化 ${unvectorizedDocs.length} 个文档`);
    } catch (error) {
      console.error('批量向量化失败:', error);
      showMessage('error', '批量向量化失败，请检查API密钥是否正确');
    } finally {
      setIsVectorizing(false);
    }
  };

  // 语义搜索
  const semanticSearch = async () => {
    if (!searchQuery.trim()) {
      showMessage('error', '请输入搜索关键词');
      return;
    }

    try {
      setIsSearching(true);
      
      // 确保所有文档都已向量化
      const unvectorizedDocs = documents.filter(doc => !doc.vectorized);
      if (unvectorizedDocs.length > 0) {
        showMessage('info', '正在向量化未处理的文档...');
        await Promise.all(
          unvectorizedDocs.map(async (doc) => {
            const embeddingResult = await aiService.createEmbedding(doc.content, {
              model: ZhipuModel.EMBEDDING_3,
              dimensions: 768
            });
            setDocuments(prev => prev.map(d => 
              d.id === doc.id 
                ? { ...d, embedding: embeddingResult.data[0].embedding, vectorized: true }
                : d
            ));
          })
        );
      }

      // 向量化查询
      const queryEmbedding = await aiService.createEmbedding(searchQuery, {
        model: ZhipuModel.EMBEDDING_3,
        dimensions: 768
      });

      // 计算相似度
      const results = documents
        .filter(doc => doc.vectorized && doc.embedding)
        .map(doc => ({
          doc,
          score: aiService.cosineSimilarity(
            queryEmbedding.data[0].embedding,
            doc.embedding!
          )
        }))
        .sort((a, b) => b.score - a.score);

      setSearchResults(results);
      showMessage('success', `找到 ${results.length} 个相关文档`);
    } catch (error) {
      console.error('搜索失败:', error);
      showMessage('error', '搜索失败，请检查API密钥是否正确');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 消息提示 */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.type === 'success' && <CheckCircle size={20} />}
          {message.type === 'error' && <AlertCircle size={20} />}
          {message.type === 'info' && <Search size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文档管理 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="text-blue-600" />
                知识库管理
              </h2>
              <button
                onClick={vectorizeAllDocuments}
                disabled={isVectorizing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isVectorizing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    处理中...
                  </>
                ) : (
                  <>
                    <FileText />
                    批量向量化
                  </>
                )}
              </button>
            </div>

            {/* 文档上传 */}
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">添加新文档</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">文档标题</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入文档标题"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">文档内容</label>
                <textarea
                  value={newDocument.content}
                  onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                  placeholder="输入文档内容"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">或上传文件</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.docx"
                    onChange={handleFileUpload}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {uploadedFile && (
                    <span className="text-sm text-gray-600">{uploadedFile.name}</span>
                  )}
                </div>
              </div>

              <button
                onClick={addDocument}
                disabled={!newDocument.title || !newDocument.content}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <Upload size={18} />
                添加文档
              </button>
            </div>

            {/* 文档列表 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">文档列表</h3>
              <div className="space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>暂无文档，请添加新文档</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{doc.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(doc.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {doc.content}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {doc.vectorized ? (
                            <span className="text-xs flex items-center gap-1 text-green-600">
                              <CheckCircle size={14} />
                              已向量化
                            </span>
                          ) : (
                            <button
                              onClick={() => vectorizeDocument(doc)}
                              disabled={isVectorizing}
                              className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                            >
                              {isVectorizing ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <FileText size={12} />
                              )}
                              向量化
                            </button>
                          )}
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：智能搜索 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6">
              <Search className="text-purple-600" />
              智能语义搜索
            </h2>

            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && semanticSearch()}
                  placeholder="输入搜索关键词..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={semanticSearch}
                  disabled={isSearching}
                  className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSearching ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">搜索结果</h3>
              <div className="space-y-3">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search size={48} className="mx-auto mb-2 opacity-50" />
                    <p>暂无搜索结果，请输入关键词搜索</p>
                  </div>
                ) : (
                  searchResults.map((result, index) => (
                    <div key={result.doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{result.doc.title}</h4>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                            {result.doc.content}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-purple-600">
                            相似度: {Math.round(result.score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;