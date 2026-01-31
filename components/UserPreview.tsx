import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ProductProject } from '../types';
import { 
  Mic, Send, Camera, Volume2, X, Sparkles, Loader2,
  Upload, Image as ImageIcon, AlertCircle, CheckCircle
} from 'lucide-react';
import { aiService } from '../services/aiService';

const UserPreview: React.FC<{ projects?: ProductProject[] }> = ({ projects }) => {
  const router = useRouter();
  const { id } = router.query;
  const projectId = typeof id === 'string' ? id : undefined;
  
  const [project, setProject] = useState<ProductProject | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string>('');
  
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string, image?: string}[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 模拟项目加载
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setProjectError('无效的项目ID');
        setProjectLoading(false);
        return;
      }

      try {
        setProjectLoading(true);
        
        // 模拟从projects数组中查找项目
        const foundProject = projects?.find(p => p.id === projectId);
        
        if (!foundProject) {
          setProjectError('项目不存在或已被删除');
          setProjectLoading(false);
          return;
        }

        if (foundProject.status !== 'active') {
          setProjectError('项目已暂停服务');
          setProjectLoading(false);
          return;
        }

        setProject(foundProject);
        setMessages([
          { role: 'assistant', text: `您好！我是 ${foundProject.name} 的 AI 专家。我已经加载了最新的产品说明书，请问有什么可以帮您？` }
        ]);
        
        setProjectLoading(false);
      } catch (error) {
        console.error('Failed to load project:', error);
        setProjectError('加载项目信息失败，请稍后重试');
        setProjectLoading(false);
      }
    };

    loadProject();
  }, [projectId, projects]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // 项目加载中
  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a103d] to-[#2d1b69] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] border-2 border-violet-500/30 p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-violet-500/20 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="animate-spin" size={40} />
            </div>
            <h1 className="text-2xl font-black text-violet-800 mb-4">正在连接服务</h1>
            <p className="text-slate-600">正在验证二维码并加载产品信息...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // 处理项目不存在或验证失败的情况
  if (!project || projectError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a103d] to-[#2d1b69] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] border-2 border-amber-500/30 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-purple-500/20 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-purple-800 mb-4">服务暂时不可用</h1>
            <p className="text-slate-600 text-center mb-4">
              {projectError || '找不到对应的项目信息，请检查二维码是否正确。'}
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-black text-purple-800 mb-4">联系我们</h2>
            
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">中恒创世技术支持</p>
                <p className="text-purple-900 font-bold">400-888-6666</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (text?: string, image?: string) => {
    const msgText = text || inputValue;
    if (!msgText && !image) return;

    const userMessage = { role: 'user' as const, text: msgText, image };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      if (image) {
        if (!project.config.multimodalEnabled) {
          setMessages(prev => [...prev, { role: 'assistant', text: "多模态分析功能已禁用，无法分析图片内容。" }]);
        } else {
          const response = await aiService.analyzeInstallation(image, project.config.visionPrompt, project.config.provider);
          setMessages(prev => [...prev, { role: 'assistant', text: response }]);
        }
      } else {
        const knowledgeBase = project.knowledgeBase || [];
        
        const newMessageId = messages.length + 1;
        setStreamingId(newMessageId);
        setStreamingMessage('');

        let accumulatedMessage = '';
        const streamCallback = (chunk: string, isDone: boolean) => {
          if (chunk) {
            accumulatedMessage += chunk;
            setStreamingMessage(accumulatedMessage);
          }
          if (isDone) {
            if (accumulatedMessage) {
              setMessages(prev => [...prev, { role: 'assistant', text: accumulatedMessage }]);
            }
            setStreamingId(null);
            setStreamingMessage(null);
          }
        };

        await aiService.getSmartResponse(
          msgText, 
          knowledgeBase, 
          project.config.provider, 
          project.config.systemInstruction,
          {
            stream: true,
            callback: streamCallback
          }
        );
      }
    } catch (e) {
      console.error('AI服务调用失败:', e);
      
      let errorMessage = "抱歉，AI服务暂时不可用。";
      
      if (e instanceof Error) {
        if (e.message.includes('401') || e.message.includes('API key')) {
          errorMessage = "AI服务配置异常，请联系中恒创世技术支持：400-888-6666";
        } else if (e.message.includes('429')) {
          errorMessage = "服务繁忙，请稍后重试。";
        } else if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = "网络连接异常，请检查网络后重试。";
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
      setStreamingId(null);
      setStreamingMessage(null);
    } finally {
      setIsTyping(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      const audioData = await aiService.generateSpeech(text, project.config.voiceName || 'tongtong', project.config.provider);
      if (audioData) {
        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.play();
      }
    } catch (error) {
      console.error('TTS播放失败:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = handleStopRecording;
      recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('无法访问麦克风，请检查权限设置。');
    }
  };

  const handleStopRecording = async () => {
    if (audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Audio = e.target?.result as string;
        if (base64Audio) {
          setIsTyping(true);
          try {
            const transcript = await aiService.recognizeSpeech(base64Audio, project.config.provider);
            if (transcript) {
              handleSend(transcript);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', text: '抱歉，我无法识别您的语音，请重试。' }]);
            }
          } catch (error) {
            console.error('语音识别失败:', error);
            setMessages(prev => [...prev, { role: 'assistant', text: '语音识别失败，请重试。' }]);
          } finally {
            setIsTyping(false);
          }
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: '语音处理失败，请重试。' }]);
      setIsTyping(false);
    } finally {
      setIsRecording(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setMediaRecorder(null);
      setAudioChunks([]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-[#0a0c10] shadow-2xl relative overflow-hidden font-sans border-x border-white/5">
      {/* Header */}
      <header className="bg-[#0f1218]/80 backdrop-blur-3xl p-6 text-white shrink-0 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 purple-gradient-btn rounded-2xl flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="font-black text-lg">{project.name}</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">AI虚拟客服</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'order-1' : 'order-2'}`}>
              <div className={`p-5 rounded-[2rem] shadow-xl text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-100 rounded-tl-none border border-white/5'
              }`}>
                {m.image && <img src={m.image} className="rounded-2xl mb-4" />}
                <p>{m.text}</p>
              </div>
              {m.role === 'assistant' && (
                <div className="flex gap-4 mt-3 pl-1">
                  <button onClick={() => playTTS(m.text)} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-violet-400">
                    <Volume2 size={12}/> Audio 播放语音
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {streamingMessage && (
          <div className="flex justify-start animate-in slide-in-from-bottom-2">
            <div className="max-w-[85%] order-2">
              <div className="p-5 rounded-[2rem] shadow-xl text-sm leading-relaxed bg-white/5 text-slate-100 rounded-tl-none border border-white/5">
                <p>{streamingMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {isTyping && !streamingMessage && (
          <div className="flex gap-2 p-4 bg-white/5 w-fit rounded-2xl rounded-tl-none">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-[#0f1218]/80 backdrop-blur-3xl border-t border-white/5">
        <div className="flex items-center gap-3 mb-4">
          {project.config.visionEnabled && (
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-violet-400">
              <Camera size={22} />
            </button>
          )}
          <button onClick={isRecording ? stopRecording : startRecording} className={`p-4 rounded-2xl border ${isRecording ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-violet-400'}`}>
            <Mic size={22} />
          </button>
        </div>
        
        <div className="relative">
          <input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="问我关于此产品的问题..."
            className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/20 pr-16"
          />
          <button onClick={() => handleSend()} className="absolute right-2 top-2 p-2 purple-gradient-btn text-white rounded-lg">
            <Send size={18} />
          </button>
        </div>
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { 
            const r = new FileReader(); 
            r.onload = () => handleSend("分析照片 Analyze photo", r.result as string); 
            r.readAsDataURL(f); 
          }
        }} />
      </div>
    </div>
  );
};

export default UserPreview;