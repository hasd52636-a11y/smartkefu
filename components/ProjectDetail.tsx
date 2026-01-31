
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ProductProject, ProjectStatus, KnowledgeType, KnowledgeItem, AIProvider, VideoGuide } from '../types';
import { 
  ArrowLeft, Save, Trash2, Plus, FileText, Mic, QrCode, Settings,
  ShieldCheck, Video, Globe, Sparkles, Play, Info, Download, 
  ExternalLink, Copy, Upload, FileUp, X, CheckCircle, Volume2,
  Send, Camera
} from 'lucide-react';
import { aiService } from '../services/aiService';

interface ProjectDetailProps {
  projects: ProductProject[];
  onUpdate: (updated: ProductProject) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, onUpdate }) => {
  const router = useRouter();
  const { id } = router.query;
  const navigate = (path: string) => router.push(path);
  const project = projects.find(p => p.id === id);
  const [activeTab, setActiveTab] = useState('knowledge');
  const [localProject, setLocalProject] = useState<ProductProject | null>(project ? JSON.parse(JSON.stringify(project)) : null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoDescription, setVideoDescription] = useState('');
  const [videoImageFile, setVideoImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // API密钥现在在后端服务器中管理
    // 前端不再需要设置API密钥
  }, []);

  if (!localProject) return <div className="p-10 text-slate-800 font-bold text-center">Project not found</div>;

  const handleSave = () => {
    onUpdate(localProject);
    alert('配置已同步 Configuration Synced!');
  };

  // 自动保存配置的函数
  const autoSave = (updatedProject: ProductProject) => {
    setLocalProject(updatedProject);
    onUpdate(updatedProject);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Fixing type error by casting Array.from(files) to File[] to ensure 'name' and 'size' properties are accessible
    const newItems: KnowledgeItem[] = (Array.from(files) as File[]).map(f => ({
      id: `k_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: f.name,
      content: `[File Context Placeholder] This file "${f.name}" has been uploaded. AI will parse its contents during inference.`,
      type: f.name.endsWith('.pdf') ? KnowledgeType.PDF : KnowledgeType.TEXT,
      fileName: f.name,
      fileSize: `${(f.size / 1024).toFixed(1)} KB`,
      createdAt: new Date().toISOString()
    }));

    if (localProject) {
      setLocalProject({
        ...localProject,
        knowledgeBase: [...localProject.knowledgeBase, ...newItems]
      });
    }
  };

  const handleManualVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 显示上传进度
    setUploadFileName(file.name);
    setUploadProgress(0);
    setUploadStatus('正在上传...');

    const reader = new FileReader();
    
    // 监听进度事件
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
        setUploadStatus(`上传中... ${progress}%`);
      }
    };
    
    reader.onload = () => {
      setUploadProgress(100);
      setUploadStatus('上传完成，处理中...');
      
      // 模拟处理时间
      setTimeout(() => {
        const newVideo: VideoGuide = {
          id: `v_${Date.now()}`,
          title: file.name,
          url: reader.result as string,
          type: 'upload',
          status: 'ready'
        };
        if (localProject) {
          setLocalProject({
            ...localProject,
            config: {
              ...localProject.config,
              videoGuides: [...localProject.config.videoGuides, newVideo]
            }
          });
        }
        
        // 清除上传状态
        setTimeout(() => {
          setUploadProgress(null);
          setUploadStatus('');
          setUploadFileName('');
        }, 1000);
      }, 1500);
    };
    
    reader.onerror = () => {
      setUploadStatus('上传失败');
      setTimeout(() => {
        setUploadProgress(null);
        setUploadStatus('');
        setUploadFileName('');
      }, 2000);
    };
    
    reader.readAsDataURL(file);
  };

  // 动态获取当前域名和端口，适配所有环境
  const port = window.location.port ? `:${window.location.port}` : '';
  const productGuideUrl = `${window.location.protocol}//${window.location.hostname}${port}${window.location.pathname}#/view/${id}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(productGuideUrl)}&color=7c3aed&bgcolor=ffffff`;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/projects')} className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-slate-500 hover:text-violet-600 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{localProject.name}</h1>
            <p className="text-slate-600 font-medium flex items-center gap-2 mt-1">
              <><Sparkles size={14} className="text-red-500" /> Zhipu GLM Cluster</>
            </p>
          </div>
        </div>
        <button onClick={handleSave} className="purple-gradient-btn text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center gap-3">
          <Save size={20} /> 手动同步 Manual Sync
        </button>
      </div>

      <div className="flex flex-wrap gap-3 p-2 bg-slate-100 border border-slate-200 backdrop-blur-3xl rounded-[2.5rem] w-fit">
        <TabButton id="knowledge" labelZh="多维知识库" labelEn="RAG Knowledge" active={activeTab === 'knowledge'} onClick={setActiveTab} icon={<FileText size={20}/>} />
        <TabButton id="video" labelZh="引导视频" labelEn="Video Guides" active={activeTab === 'video'} onClick={setActiveTab} icon={<Video size={20}/>} />
        <TabButton id="qr" labelZh="发布部署" labelEn="Deployment" active={activeTab === 'qr'} onClick={setActiveTab} icon={<QrCode size={20}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {activeTab === 'knowledge' && (
            <div className="space-y-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 hover:border-violet-500/50 bg-slate-100 p-12 rounded-[3rem] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4"
              >
                <div className="p-5 bg-violet-500/10 text-violet-600 rounded-full group-hover:scale-110 transition-transform">
                  <FileUp size={40} />
                </div>
                <div>
                  <h4 className="text-slate-800 font-bold text-lg">点击或拖拽上传文档 Click to Upload</h4>
                  <p className="text-slate-500 text-sm mt-1">支持 PDF, TXT, DOCX. 系统将自动分片并进行 Embedding 处理。</p>
                </div>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              </div>

              <div className="grid gap-6">
                {localProject.knowledgeBase.map((item) => (
                  <div key={item.id} className="glass-card p-6 rounded-[2rem] border border-slate-200 group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
                        {item.type === KnowledgeType.PDF ? <FileText size={24} className="text-amber-500"/> : <FileText size={24}/>}
                      </div>
                      <div className="flex-1">
                        <input 
                          className="bg-transparent border-none outline-none font-bold text-slate-800 w-full"
                          value={item.title}
                          onChange={(e) => setLocalProject({...localProject, knowledgeBase: localProject.knowledgeBase.map(i => i.id === item.id ? {...i, title: e.target.value} : i)})}
                        />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{item.type} • {item.fileSize || 'Manual'}</p>
                      </div>
                      <button onClick={() => setLocalProject({...localProject, knowledgeBase: localProject.knowledgeBase.filter(i => i.id !== item.id)})} className="p-2 text-slate-500 hover:text-pink-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-8 rounded-[3rem] border border-slate-200 flex flex-col justify-between group">
                  <div>
                    <Sparkles className="text-violet-500 mb-6" size={32} />
                    <h4 className="text-xl font-bold text-slate-800">AI 智能合成 Video AI</h4>
                    <p className="text-sm text-slate-600 mt-2">基于用户提供的图片和文字生成更精确的虚拟引导视频。</p>
                    
                    {/* 图片上传入口 */}
                    <div className="mt-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">上传参考图片</label>
                      <input 
                        type="file" 
                        ref={videoImageInputRef}
                        onChange={(e) => setVideoImageFile(e.target.files?.[0])}
                        accept="image/*"
                        className="block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-xl file:border-0
                          file:text-sm file:font-medium
                          file:bg-violet-50 file:text-violet-700
                          hover:file:bg-violet-100"
                      />
                      {videoImageFile && (
                        <p className="text-xs text-slate-500 mt-2">已选择文件: {videoImageFile.name}</p>
                      )}
                    </div>
                    
                    {/* 文字输入框 */}
                    <div className="mt-4">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">视频内容描述 (2000字内)</label>
                      <textarea 
                        value={videoDescription}
                        onChange={(e) => {
                          if (e.target.value.length <= 2000) {
                            setVideoDescription(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all h-32 resize-none"
                        placeholder="请详细描述视频内容，包括：
1. 视频主题和目的
2. 关键步骤和流程
3. 重点强调的内容
4. 目标受众和使用场景

例如：为SmartHome Pro Hub生成安装视频，包括开箱、连接电源、连接WiFi、添加设备等步骤，重点强调安全注意事项和故障排查。"
                      />
                      <div className="flex justify-end mt-1">
                        <span className={`text-xs font-bold ${videoDescription.length > 1800 ? 'text-amber-500' : 'text-slate-500'}`}>
                          {videoDescription.length}/2000
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* 上传进度显示 */}
                  {uploadProgress !== null && (
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                          {uploadFileName || 'AI Generated Video'}
                        </span>
                        <span className="text-xs font-black text-amber-600">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {uploadStatus}
                      </p>
                    </div>
                  )}
                  
                  <button 
                    disabled={isGeneratingVideo}
                    onClick={async () => {
                      setIsGeneratingVideo(true);
                      setUploadProgress(0);
                      setUploadStatus('正在生成视频...');
                      setUploadFileName('AI Generated Video');
                      
                      try {
                        // 构建视频生成提示
                        let prompt = `Create a video guide for ${localProject.name}`;
                        if (videoDescription) {
                          prompt += `: ${videoDescription}`;
                        } else {
                          prompt += `: Installation and usage guide`;
                        }
                        
                        // 模拟视频生成进度
                        const progressInterval = setInterval(() => {
                          setUploadProgress(prev => {
                            if (prev === null || prev >= 80) {
                              clearInterval(progressInterval);
                              return prev || 80;
                            }
                            return prev + 10;
                          });
                        }, 300);
                        
                        // 调用AI服务生成视频
                        const videoResult = await aiService.generateVideoGuide(prompt, localProject.config.provider);
                        
                        clearInterval(progressInterval);
                        setUploadProgress(90);
                        setUploadStatus('正在向量化...');
                        
                        // 模拟向量化进度
                        const vectorizeInterval = setInterval(() => {
                          setUploadProgress(prev => {
                            if (prev === null || prev >= 100) {
                              clearInterval(vectorizeInterval);
                              return prev || 100;
                            }
                            return prev + 5;
                          });
                        }, 200);
                        
                        // 向量化视频内容（模拟）
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        clearInterval(vectorizeInterval);
                        setUploadProgress(100);
                        setUploadStatus('已存放到多维知识库');
                        
                        if (localProject && videoResult) {
                          setLocalProject({
                            ...localProject,
                            config: {
                              ...localProject.config,
                              videoGuides: [...localProject.config.videoGuides, { 
                                id: `v_${Date.now()}`, 
                                title: 'AI Generated Guide', 
                                url: typeof videoResult === 'string' ? videoResult : '', 
                                type: 'ai', 
                                status: 'ready'
                              }]
                            }
                          });
                        }
                        
                        // 清空输入
                        setVideoDescription('');
                        setVideoImageFile(null);
                        if (videoImageInputRef.current) {
                          videoImageInputRef.current.value = '';
                        }
                        
                        // 清除上传状态
                        setTimeout(() => {
                          setUploadProgress(null);
                          setUploadStatus('');
                          setUploadFileName('');
                        }, 1500);
                      } catch (error) {
                        console.error('Video generation failed:', error);
                        setUploadStatus('生成失败');
                        setTimeout(() => {
                          setUploadProgress(null);
                          setUploadStatus('');
                          setUploadFileName('');
                        }, 2000);
                      } finally {
                        setIsGeneratingVideo(false);
                      }
                    }}
                    className="mt-8 py-4 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-2xl font-black text-xs uppercase hover:bg-violet-500 hover:text-white transition-all"
                  >
                    {isGeneratingVideo ? 'Generating...' : 'Start AI Generation'}
                  </button>
                </div>

                <div className="glass-card p-8 rounded-[3rem] border border-slate-200 flex flex-col justify-between group">
                  <div>
                    <Upload className="text-amber-500 mb-6" size={32} />
                    <h4 className="text-xl font-bold text-slate-800">商家专业上传 Upload</h4>
                    <p className="text-sm text-slate-600 mt-2">上传 100% 准确的实拍安装视频（推荐）。</p>
                  </div>
                  
                  {/* 上传进度显示 */}
                  {uploadProgress !== null && (
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                          {uploadFileName}
                        </span>
                        <span className="text-xs font-black text-amber-600">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 text-center">
                        {uploadStatus}
                      </p>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => videoInputRef.current?.click()} 
                    disabled={uploadProgress !== null}
                    className="mt-8 py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-black text-xs uppercase hover:bg-amber-500 hover:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadProgress !== null ? '上传中...' : 'Upload MP4/MOV'}
                  </button>
                  <input type="file" ref={videoInputRef} onChange={handleManualVideoUpload} accept="video/*" className="hidden" />
                </div>

                <div className={`glass-card p-8 rounded-[3rem] border ${localProject.config.visionEnabled ? 'border-slate-200' : 'border-slate-300 opacity-70'} flex flex-col justify-between group`}>
                  <div>
                    <Camera className={`${localProject.config.visionEnabled ? 'text-blue-500' : 'text-slate-400'} mb-6`} size={32} />
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xl font-bold text-slate-800">图片分析 AI</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={localProject.config.visionEnabled}
                          onChange={(e) => {
                            const updatedProject = {
                              ...localProject,
                              config: {
                                ...localProject.config,
                                visionEnabled: e.target.checked
                              }
                            };
                            autoSave(updatedProject);
                          }}
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">智能分析用户上传的图片，识别安装问题并提供解决方案。</p>
                    {!localProject.config.visionEnabled && (
                      <p className="text-sm text-amber-500 mt-2 font-medium">功能已禁用</p>
                    )}
                    
                    {localProject.config.visionEnabled && (
                      <div className="mt-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">图片分析提示词</label>
                        <textarea 
                          value={localProject.config.visionPrompt}
                          onChange={(e) => {
                            const updatedProject = {
                              ...localProject,
                              config: {
                                ...localProject.config,
                                visionPrompt: e.target.value
                              }
                            };
                            setLocalProject(updatedProject);
                          }}
                          onBlur={() => {
                            // 失去焦点时自动保存
                            onUpdate(localProject);
                          }}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all h-24 resize-none"
                          placeholder="请分析安装照片，检查产品安装是否正确，并提供专业的安装指导建议。"
                        />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      if (!localProject.config.visionEnabled) {
                        alert('图片分析功能已禁用，请先启用该功能');
                        return;
                      }
                      alert('图片分析功能已启用，用户可以通过扫码后上传图片进行分析。');
                    }}
                    disabled={!localProject.config.visionEnabled}
                    className={`mt-8 py-4 ${localProject.config.visionEnabled ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white' : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'} rounded-2xl font-black text-xs uppercase transition-all`}
                  >
                    {localProject.config.visionEnabled ? 'Test Vision' : 'Disabled'}
                  </button>
                </div>

                <div className={`glass-card p-8 rounded-[3rem] border ${localProject.config.multimodalEnabled ? 'border-slate-200' : 'border-slate-300 opacity-70'} flex flex-col justify-between group`}>
                  <div>
                    <Video className={`${localProject.config.multimodalEnabled ? 'text-red-500' : 'text-slate-400'} mb-6`} size={32} />
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xl font-bold text-slate-800">多模态分析 AI</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={localProject.config.multimodalEnabled}
                          onChange={(e) => {
                            const updatedProject = {
                              ...localProject,
                              config: {
                                ...localProject.config,
                                multimodalEnabled: e.target.checked
                              }
                            };
                            autoSave(updatedProject);
                          }}
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">智能分析视频、音频内容，提取关键信息。</p>
                    {!localProject.config.multimodalEnabled && (
                      <p className="text-sm text-amber-500 mt-2 font-medium">功能已禁用</p>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      if (!localProject.config.multimodalEnabled) {
                        alert('多模态分析功能已禁用，请先启用该功能');
                        return;
                      }
                      if (localProject.config.videoGuides.length === 0) {
                        alert('请先上传视频或生成视频指南');
                        return;
                      }
                      alert('正在分析视频内容，请稍候...');
                      try {
                        // 获取第一个视频的URL
                        const firstVideo = localProject.config.videoGuides[0];
                        // 调用多模态分析API
                        const analysisResult = await aiService.analyzeMultimodal(
                          [
                            { type: 'text', text: '分析这个视频的内容，提取关键信息和步骤' },
                            { type: 'image_url', image_url: { url: firstVideo.url } }
                          ],
                          localProject.config.provider
                        );
                        alert('分析结果：\n' + analysisResult);
                      } catch (error) {
                        console.error('多模态分析失败:', error);
                        alert('多模态分析失败，请检查API密钥是否正确');
                      }
                    }}
                    disabled={!localProject.config.multimodalEnabled}
                    className={`mt-8 py-4 ${localProject.config.multimodalEnabled ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'} rounded-2xl font-black text-xs uppercase transition-all`}
                  >
                    {localProject.config.multimodalEnabled ? 'Start Analysis' : 'Disabled'}
                  </button>
                </div>
                
                <div className={`glass-card p-8 rounded-[3rem] border ${localProject.config.videoChatEnabled ? 'border-slate-200' : 'border-slate-300 opacity-70'} flex flex-col justify-between group`}>
                  <div>
                    <Video className={`${localProject.config.videoChatEnabled ? 'text-violet-500' : 'text-slate-400'} mb-6`} size={32} />
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-bold text-slate-800">视频客服 AI</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={localProject.config.videoChatEnabled}
                          onChange={(e) => {
                            const isEnabled = e.target.checked;
                            const updatedProject = {
                              ...localProject,
                              config: {
                                ...localProject.config,
                                videoChatEnabled: isEnabled,
                                // 当主开关开启时，自动启用虚拟人和标注工具
                                avatarEnabled: isEnabled,
                                annotationEnabled: isEnabled
                              }
                            };
                            autoSave(updatedProject);
                          }}
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">视频分析提示词</label>
                        <textarea 
                          value={localProject.config.videoChatPrompt}
                          onChange={(e) => {
                            const updatedProject = {
                              ...localProject,
                              config: {
                                ...localProject.config,
                                videoChatPrompt: e.target.value
                              }
                            };
                            setLocalProject(updatedProject);
                          }}
                          onBlur={() => {
                            // 失去焦点时自动保存
                            onUpdate(localProject);
                          }}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all h-32 resize-none"
                          placeholder="您是中恒创世科技的专业技术支持专家。请仔细分析用户提供的视频内容，识别产品使用或安装过程中的具体问题，并基于产品知识库提供准确的解决方案。"
                        />
                      </div>
                      
                      {localProject.config.videoChatEnabled && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <p className="text-xs text-slate-600 mb-2">
                            <span className="font-bold">已启用功能：</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-700">
                              ✓ 虚拟人形象
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-700">
                              ✓ 视频标注工具
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-violet-100 text-violet-700">
                              ✓ 实时视频分析
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!localProject.config.videoChatEnabled && (
                      <p className="text-sm text-amber-500 mt-4 font-medium">功能已禁用</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {localProject.config.videoGuides.map(v => (
                  <div key={v.id} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group bg-black/40">
                    {v.type === 'upload' ? (
                      <video src={v.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-violet-500/20"><Video size={40}/></div>
                    )}
                    
                    {/* 审核状态标记 */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${v.status === 'ready' ? 'bg-green-500/20 text-green-400' : v.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {v.status === 'ready' ? '就绪' : v.status === 'generating' ? '生成中' : '失败'}
                      </span>
                    </div>
                    
                    {/* 视频类型标记 */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-3 py-1 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        {v.type === 'upload' ? '上传' : 'AI生成'}
                      </span>
                    </div>
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                       <button onClick={() => {
                         if (localProject) {
                           setLocalProject({...localProject, config: {...localProject.config, videoGuides: localProject.config.videoGuides.filter(vg => vg.id !== v.id)}});
                         }
                       }} className="p-3 bg-red-500/20 text-red-400 rounded-full"><Trash2 size={20}/></button>
                       <span className="text-[10px] text-white font-black uppercase tracking-widest">{v.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
             <div className="glass-card p-12 rounded-[4rem] border border-slate-200 flex flex-col md:flex-row items-center gap-12">
               <div className="w-64 h-64 bg-white p-4 rounded-[3rem] shadow-2xl">
                 <img src={qrImageUrl} className="w-full h-full rounded-[2rem]" />
               </div>
               <div className="flex-1 space-y-6">
                 <h3 className="text-3xl font-black text-slate-800">产品“数字身份证”</h3>
                 <p className="text-slate-600 font-medium">该二维码直接链接到产品的 RAG 知识库与视觉 AI 节点。印刷在包装上后，用户可获得实时的精准售后支持。</p>
                 <div className="flex gap-4">
                   <button onClick={async () => {
                     try {
                       const response = await fetch(qrImageUrl);
                       const blob = await response.blob();
                       const url = window.URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = `${localProject.name}_qrcode.png`;
                       document.body.appendChild(a);
                       a.click();
                       window.URL.revokeObjectURL(url);
                       document.body.removeChild(a);
                     } catch (error) {
                       console.error('Failed to download QR code:', error);
                       alert('Failed to download QR code. Please try again.');
                     }
                   }} className="px-8 py-3.5 gold-gradient-btn text-slate-900 font-black rounded-2xl text-sm flex items-center gap-2">
                      <Download size={20}/> Download PNG
                   </button>
                   <button onClick={() => window.open(`#/view/${id}`, '_blank')} className="px-8 py-3.5 bg-slate-100 border border-slate-200 text-slate-800 font-black rounded-2xl text-sm">
                      Preview 预览
                   </button>
                </div>
               </div>
             </div>
          )}
        </div>

        <div className="space-y-8">
           <div className="glass-card p-8 rounded-[3rem] border border-slate-200">
              <h4 className="text-slate-800 font-bold mb-6 flex items-center gap-2"><ShieldCheck size={20} className="text-violet-600"/> RAG 运行状态</h4>
              <div className="space-y-5">
                 <StatusRow label="Embedding Node" value="ACTIVE" color="text-emerald-600" />
                 <StatusRow label="Vector Index" value={`${localProject.knowledgeBase.length} Chunks`} />
                 <StatusRow label="Rerank Model" value="Enabled" />
                 <StatusRow label="TTS Provider" value="Zhipu GLM" />
              </div>
           </div>
           
           <div className="glass-card p-8 rounded-[3rem] border border-slate-200">
              <h4 className="text-slate-800 font-bold mb-6 flex items-center gap-2"><Volume2 size={20} className="text-amber-500"/> 语音设置</h4>
              <div className="space-y-5">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">音色选择</span>
                    <select 
                      value={localProject.config.voiceName}
                      onChange={(e) => {
                        const updatedProject = {
                          ...localProject,
                          config: {
                            ...localProject.config,
                            voiceName: e.target.value
                          }
                        };
                        autoSave(updatedProject);
                      }}
                      className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all"
                    >
                      {/* 智谱官方支持的语音 */}
                      <option value="tongtong">彤彤 (tongtong) - 默认女声</option>
                      <option value="chuichui">锤锤 (chuichui) - 男声</option>
                      <option value="xiaochen">小陈 (xiaochen) - 女声</option>
                      <option value="jam">动物圈JAM (jam) - 特色音色</option>
                      <option value="kazi">动物圈卡兹 (kazi) - 特色音色</option>
                      <option value="douji">动物圈豆几 (douji) - 特色音色</option>
                      <option value="luodo">动物圈洛多 (luodo) - 特色音色</option>
                    </select>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">语音合成</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            // 检查API密钥
                            const savedApiKey = localStorage.getItem('zhipuApiKey');
                            if (!savedApiKey) {
                              alert('请先在设置页面配置智谱AI密钥');
                              return;
                            }
                            
                            // 确保API密钥已设置到服务中
                            // API密钥现在在后端服务器中管理
                            // 前端不再需要设置API密钥
                            
                            // 显示加载状态
                            const button = event.target as HTMLButtonElement;
                            const originalText = button.textContent;
                            button.disabled = true;
                            button.textContent = '生成中...';
                            
                            console.log(`[语音预览] 测试语音: ${localProject.config.voiceName}`);
                            
                            const audioData = await aiService.generateSpeech('您好，这是一个语音示例', localProject.config.voiceName, localProject.config.provider);
                            
                            // 恢复按钮状态
                            button.disabled = false;
                            button.textContent = originalText;
                            
                            if (audioData) {
                              console.log('[语音预览] 语音生成成功，开始播放');
                              const audio = new Audio(`data:audio/wav;base64,${audioData}`);
                              audio.play().catch(err => {
                                console.error('[语音预览] 播放失败:', err);
                                alert('音频播放失败，请检查浏览器音频权限');
                              });
                            } else {
                              console.error('[语音预览] 语音生成失败');
                              alert(`语音生成失败。可能原因：\n1. 语音 "${localProject.config.voiceName}" 没有使用权限\n2. API密钥权限不足\n3. 网络连接问题\n\n请检查浏览器控制台获取详细错误信息。`);
                            }
                          } catch (error) {
                            console.error('语音预览失败:', error);
                            
                            // 恢复按钮状态
                            const button = event.target as HTMLButtonElement;
                            button.disabled = false;
                            button.textContent = '预览音色';
                            
                            let errorMessage = '语音预览失败: ';
                            if (error instanceof Error) {
                              if (error.message.includes('401')) {
                                errorMessage += 'API密钥认证失败';
                              } else if (error.message.includes('403')) {
                                errorMessage += `没有语音 "${localProject.config.voiceName}" 的使用权限`;
                              } else if (error.message.includes('404')) {
                                errorMessage += `语音 "${localProject.config.voiceName}" 不存在`;
                              } else if (error.message.includes('429')) {
                                errorMessage += '请求过于频繁，请稍后重试';
                              } else {
                                errorMessage += error.message;
                              }
                            } else {
                              errorMessage += '未知错误';
                            }
                            
                            alert(errorMessage + '\n\n建议：\n1. 尝试使用 "tongtong" 语音\n2. 检查API密钥是否正确\n3. 查看浏览器控制台获取详细信息');
                          }
                        }}
                        className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl text-xs hover:bg-amber-400 transition-all"
                      >
                        预览音色
                      </button>
                    </div>
                 </div>
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-800 font-medium">
                      <strong>💡 语音使用提示：</strong><br/>
                      • <strong>tongtong</strong> 是默认语音，通常都可以使用<br/>
                      • 其他语音可能需要特定权限或付费账户<br/>
                      • 如果某个语音无法使用，请尝试 tongtong<br/>
                      • 详细错误信息请查看浏览器控制台
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatusRow = ({ label, value, color = "text-slate-800" }: any) => (
  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
    <span className="text-slate-500">{label}</span>
    <span className={color}>{value}</span>
  </div>
);

const TabButton = ({ id, labelZh, labelEn, active, onClick, icon }: any) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-3 px-8 py-3 rounded-[2rem] font-bold text-sm transition-all duration-500 ${active ? 'purple-gradient-btn text-white shadow-xl scale-105' : 'text-slate-600 hover:text-slate-900'}`}>
    {icon}
    <div className="flex flex-col items-start leading-none">
       <span className="text-[11px] font-black">{labelZh}</span>
       <span className="text-[9px] opacity-60 uppercase font-black tracking-tighter">{labelEn}</span>
    </div>
  </button>
);

export default ProjectDetail;
