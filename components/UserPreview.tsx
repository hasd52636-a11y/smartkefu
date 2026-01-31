import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ProductProject, AIProvider, KnowledgeType } from '../types';
import { 
  Mic, Send, Camera, Volume2, Video, X, Sparkles, Globe, Waves, 
  PlayCircle, FileText, ChevronRight, Pencil, Circle, ArrowRight, Highlighter,
  Upload, Image as ImageIcon, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { aiService, RealtimeCallback, Annotation } from '../services/aiService';
import { projectService } from '../services/projectService';

const UserPreview: React.FC<{ projects?: ProductProject[] }> = ({ projects }) => {
  const { id } = useParams();
  const projectId = id;
  const [project, setProject] = useState<ProductProject | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string>('');
  
  // 所有状态初始化移到组件顶层
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string, image?: string}[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = useState({ type: 'info' as 'info' | 'success' | 'error', text: '' });
  const [isVideoChatActive, setIsVideoChatActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [avatarState, setAvatarState] = useState({
    expression: 'neutral',
    gesture: 'idle',
    speech: '',
    mouthShape: 'closed'
  });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotationType, setCurrentAnnotationType] = useState<'arrow' | 'circle' | 'text' | 'highlight'>('arrow');
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  
  // References
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const videoStreamRef = useRef<MediaStream | null>(null);

  // 清理视频聊天函数（移到最前面，确保在useEffect中被调用时已定义）
  const cleanupVideoChat = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    aiService.disconnectFromRealtime();
    setIsVideoChatActive(false);
    setVideoStream(null);
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setAnnotations([]);
  };

  // 从服务端加载项目数据
  useEffect(() => {
    console.log('=== 扫码流程开始 ===');
    console.log('当前projectId:', projectId);
    
    const loadProject = async () => {
      console.log('1. 开始加载项目:', projectId);
      if (!projectId) {
        console.log('2. 项目ID为空');
        setProjectError('无效的项目ID');
        setProjectLoading(false);
        console.log('3. 处理空项目ID完成');
        return;
      }

      try {
        console.log('4. 设置加载状态为true');
        setProjectLoading(true);
        setProjectError('');
        console.log('5. 验证项目ID:', projectId);
        
        // 验证项目ID并获取项目数据
        console.log('6. 调用projectService.validateProjectId');
        const validation = await projectService.validateProjectId(projectId);
        console.log('7. 验证结果:', validation);
        
        if (!validation.valid) {
          console.log('8. 项目验证失败:', validation.error);
          setProjectError(validation.error || '项目验证失败');
          setProjectLoading(false);
          console.log('9. 处理验证失败完成');
          return;
        }

        console.log('10. 项目验证成功:', validation.project);
        const validatedProject = validation.project!;
        
        // 检查知识库
        if (validatedProject.knowledgeBase && validatedProject.knowledgeBase.length > 0) {
          console.log('11. 知识库加载成功:', validatedProject.knowledgeBase.length, '条条目');
        } else {
          console.log('11. 知识库为空，使用默认知识');
        }
        
        // 记录用户访问（匿名统计）
        console.log('12. 记录用户访问');
        await projectService.logUserAccess(projectId, {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        });
        
        console.log('13. 项目加载完成，准备更新状态');
        
        // 直接更新状态，避免setTimeout可能导致的问题
        console.log('14. 开始更新状态...');
        console.log('14.1 设置project状态:', validatedProject.id, validatedProject.name);
        setProject(validatedProject);
        
        // 初始化messages状态
        const welcomeMessage = `您好！我是 ${validatedProject.name} 的 AI 专家。我已经加载了最新的产品说明书和视频教程，请问有什么可以帮您？`;
        console.log('14.2 设置欢迎消息:', welcomeMessage);
        setMessages([
          { 
            role: 'assistant', 
            text: welcomeMessage 
          }
        ]);
        
        console.log('14.3 设置projectLoading为false');
        setProjectLoading(false);
        console.log('15. 状态更新完成，项目已就绪');
        console.log('=== 扫码流程结束 ===');
      } catch (error) {
        console.error('16. 加载项目失败:', error);
        setProjectError('加载项目信息失败，请稍后重试');
        setProjectLoading(false);
        console.log('17. 处理错误完成');
      }
    };

    loadProject();
  }, [projectId]);

  // 初始化AI服务（静默加载商家预配置的API密钥）
  useEffect(() => {
    const initializeAIService = () => {
      // 尝试从localStorage加载商家预配置的API密钥
      const savedApiKey = localStorage.getItem('zhipuApiKey');
      if (savedApiKey) {
        aiService.setZhipuApiKey(savedApiKey);
      }
      // 如果没有localStorage中的密钥，aiService会自动使用环境变量中的密钥
    };
    
    initializeAIService();
  }, []);

  // 滚动到最新消息
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // 清理视频聊天
  useEffect(() => {
    return () => {
      cleanupVideoChat();
    };
  }, []);

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
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-purple-800">
                <strong>可能的原因：</strong><br/>
                • 二维码已过期或无效<br/>
                • 产品服务已暂停<br/>
                • 网络连接问题<br/>
                • 请联系中恒创世技术支持
              </p>
            </div>
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
            
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">官方网站</p>
                <p className="text-purple-900 font-bold">www.aivirtualservice.com</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest">微信公众号</p>
                <p className="text-purple-900 font-bold">AI虚拟客服助手</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-purple-200 pt-6">
            <h3 className="text-sm font-black text-purple-800 mb-3">公司信息</h3>
            <p className="text-slate-600 text-sm mb-2">公司名称：智能科技有限公司</p>
            <p className="text-slate-600 text-sm">地址：北京市海淀区科技园区88号智能大厦15层</p>
          </div>
        </div>
      </div>
    );
  }

  // Video chat functions
  const toggleVideoChat = async () => {
    if (isVideoChatActive) {
      cleanupVideoChat();
    } else {
      await initializeVideoChat();
    }
  };

  const initializeVideoChat = async () => {
    try {
      console.log('开始初始化视频聊天...');
      
      // 检查API密钥是否存在
      const savedApiKey = localStorage.getItem('zhipuApiKey');
      if (!savedApiKey) {
        console.error('视频客服连接失败: 缺少API密钥');
        setMessages(prev => [...prev, { role: 'assistant', text: '视频客服连接失败，请联系管理员配置API密钥。' }]);
        return;
      }
      
      // 确保API密钥已设置到AI服务
      aiService.setZhipuApiKey(savedApiKey);
      console.log('API密钥已设置');
      
      // Request camera and microphone permissions
      console.log('请求摄像头和麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
      
      console.log('获取到媒体流:', stream);
      setVideoStream(stream);
      videoStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('视频流已设置到video元素');
      }
      
      // Connect to GLM-Realtime
      console.log('连接到GLM-Realtime...');
      const connected = await connectToRealtime();
      
      if (connected) {
        // Start render loop for annotations
        console.log('启动标注渲染循环...');
        startRenderLoop();
        
        console.log('视频聊天初始化完成');
        setIsVideoChatActive(true);
      } else {
        console.error('GLM-Realtime连接失败');
        setMessages(prev => [...prev, { role: 'assistant', text: '视频客服连接失败，请检查网络连接和API密钥配置。' }]);
        // 清理资源
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setVideoStream(null);
        videoStreamRef.current = null;
      }
    } catch (error) {
      console.error('Failed to initialize video chat:', error);
      let errorMessage = '无法访问摄像头或麦克风，请检查权限设置。';
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          errorMessage = '摄像头或麦克风权限被拒绝，请在浏览器设置中允许访问。';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = '未找到摄像头或麦克风设备。';
        } else {
          errorMessage = `视频初始化失败: ${error.message}`;
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
    }
  };

  const connectToRealtime = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const callback: RealtimeCallback = (data, type) => {
        console.log('收到GLM-Realtime消息:', type, data);
        
        switch (type) {
          case 'status':
            console.log('连接状态更新:', data.status);
            setConnectionStatus(data.status || 'disconnected');
            setIsConnected(data.status === 'connected');
            if (data.status === 'connected') {
              resolve(true);
            } else if (data.error) {
              console.error('GLM-Realtime连接错误:', data.error);
              resolve(false);
            }
            break;
          case 'text':
            if (data.type === 'content_part_done') {
              console.log('Content part completed:', data.part);
            } else if (data.type === 'function_call_done') {
              console.log('Function call completed:', data.function_name, data.function_arguments);
            } else if (data.text) {
              console.log('收到文本消息:', data.text);
              setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
              
              // Update avatar state
              setAvatarState(prev => ({
                ...prev,
                speech: data.text,
                mouthShape: 'talking',
                expression: 'happy'
              }));
              
              // Reset avatar state after 3 seconds
              setTimeout(() => {
                setAvatarState(prev => ({
                  ...prev,
                  mouthShape: 'closed',
                  expression: 'neutral'
                }));
              }, 3000);
            }
            break;
          case 'annotation':
            handleAnnotationUpdate(data);
            break;
          case 'audio':
            handleAudioData(data);
            break;
          case 'video':
            handleVideoData(data);
            break;
        }
      };
      
      console.log('开始连接GLM-Realtime...');
      aiService.connectToRealtime(callback).then(success => {
        console.log('GLM-Realtime连接结果:', success);
        resolve(success);
      }).catch(error => {
        console.error('GLM-Realtime连接异常:', error);
        resolve(false);
      });
    });
  };

  const startRenderLoop = () => {
    const render = () => {
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw annotations
          drawAnnotations(ctx);
        }
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    animationFrameRef.current = requestAnimationFrame(render);
  };

  const drawAnnotations = (ctx: CanvasRenderingContext2D) => {
    annotations.forEach(annotation => {
      ctx.save();
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = 2;
      
      switch (annotation.type) {
        case 'arrow':
          drawArrow(ctx, annotation);
          break;
        case 'circle':
          drawCircle(ctx, annotation);
          break;
        case 'text':
          drawText(ctx, annotation);
          break;
        case 'highlight':
          drawHighlight(ctx, annotation);
          break;
      }
      
      ctx.restore();
    });
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { position, size } = annotation;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + size.width, position.y + size.height);
    ctx.stroke();
    
    // Draw arrow head
    const angle = Math.atan2(size.height, size.width);
    const arrowLength = 15;
    ctx.beginPath();
    ctx.moveTo(position.x + size.width, position.y + size.height);
    ctx.lineTo(
      position.x + size.width - arrowLength * Math.cos(angle - Math.PI / 6),
      position.y + size.height - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(position.x + size.width, position.y + size.height);
    ctx.lineTo(
      position.x + size.width - arrowLength * Math.cos(angle + Math.PI / 6),
      position.y + size.height - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { position, size } = annotation;
    ctx.beginPath();
    ctx.arc(position.x, position.y, Math.max(size.width, size.height) / 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawText = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { position, content } = annotation;
    ctx.font = '16px Arial';
    ctx.fillStyle = annotation.color;
    ctx.fillText(content, position.x, position.y);
  };

  const drawHighlight = (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
    const { position, size } = annotation;
    ctx.fillStyle = `${annotation.color}40`; // Semi-transparent
    ctx.fillRect(position.x, position.y, size.width, size.height);
  };

  const handleAnnotationUpdate = (data: any) => {
    switch (data.action) {
      case 'add':
        setAnnotations(prev => [...prev, data.annotation]);
        break;
      case 'update':
        setAnnotations(prev => prev.map(a => a.id === data.id ? { ...a, ...data.updates } : a));
        break;
      case 'delete':
        setAnnotations(prev => prev.filter(a => a.id !== data.id));
        break;
    }
  };

  const handleAudioData = (data: any) => {
    if (data.audio) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleVideoData = (data: any) => {
    // Handle video data from server
    console.log('Received video data:', data);
  };

  const toggleVideo = () => {
    if (videoStream) {
      const videoTracks = videoStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (videoStream) {
      const audioTracks = videoStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioOn;
      });
      setIsAudioOn(!isAudioOn);
    }
  };

  const addAnnotation = (type: 'arrow' | 'circle' | 'text' | 'highlight', content: string = '') => {
    const newAnnotation = aiService.addAnnotation({
      type,
      position: { x: 100, y: 100 },
      size: { width: 100, height: 50 },
      content: content || '标注内容',
      color: '#FF5722'
    });
    
    if (newAnnotation) {
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  const handleSend = async (text?: string, image?: string) => {
    const msgText = text || inputValue;
    if (!msgText && !image) return;

    // 立即添加用户消息到界面
    const userMessage = { role: 'user' as const, text: msgText, image };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      if (image) {
        if (!project.config.multimodalEnabled) {
          setMessages(prev => [...prev, { role: 'assistant', text: "多模态分析功能已禁用，无法分析图片内容。" }]);
        } else {
          // 检查API密钥是否存在
          const savedApiKey = localStorage.getItem('zhipuApiKey');
          if (!savedApiKey) {
            console.error('图片分析失败: 缺少API密钥');
            setMessages(prev => [...prev, { role: 'assistant', text: '图片分析失败，请联系管理员配置API密钥。' }]);
            return;
          }
          
          // 确保API密钥已设置到AI服务
          aiService.setZhipuApiKey(savedApiKey);
          console.log('API密钥已设置');
          
          // 图片分析暂时不使用流式输出
          console.log('开始分析图片...');
          const response = await aiService.analyzeInstallation(image, project.config.visionPrompt, project.config.provider);
          console.log('图片分析结果:', response);
          setMessages(prev => [...prev, { role: 'assistant', text: response }]);
        }
      } else {
        // 确保知识库存在
        const knowledgeBase = project.knowledgeBase || [];
        console.log('发送文本消息:', msgText, '知识库大小:', knowledgeBase.length);

        // 定义工具
        const tools = project.config.provider === AIProvider.ZHIPU ? [
          {
            type: 'function' as const,
            function: {
              name: 'get_product_info',
              description: '获取产品详细信息',
              parameters: {
                type: 'object',
                properties: {
                  product_id: {
                    type: 'string',
                    description: '产品ID'
                  }
                },
                required: ['product_id']
              }
            }
          },
          {
            type: 'function' as const,
            function: {
              name: 'check_inventory',
              description: '检查产品库存',
              parameters: {
                type: 'object',
                properties: {
                  product_id: {
                    type: 'string',
                    description: '产品ID'
                  },
                  location: {
                    type: 'string',
                    description: '库存位置'
                  }
                },
                required: ['product_id']
              }
            }
          }
        ] : undefined;

        // 对于文本消息，使用流式输出
        const newMessageId = messages.length + 1;
        setStreamingId(newMessageId);
        setStreamingMessage('');

        // 流式回调函数
        const streamCallback = (chunk: string, isDone: boolean) => {
          if (chunk) {
            setStreamingMessage(prev => (prev || '') + chunk);
          }
          if (isDone) {
            if (streamingMessage) {
              setMessages(prev => [...prev, { role: 'assistant', text: streamingMessage }]);
            }
            setStreamingId(null);
            setStreamingMessage(null);
          }
        };

        // 调用AI服务，使用流式输出
        console.log('调用AI服务获取智能响应...');
        await aiService.getSmartResponse(
          msgText, 
          knowledgeBase, 
          project.config.provider, 
          project.config.systemInstruction,
          {
            stream: true,
            callback: streamCallback,
            tools: tools
          }
        );
        console.log('AI服务调用完成');
      }
    } catch (e) {
      console.error('AI服务调用失败:', e);
      
      // 根据错误类型给出不同的用户友好提示
      let errorMessage = "抱歉，AI服务暂时不可用。";
      
      if (e instanceof Error) {
        if (e.message.includes('401') || e.message.includes('API key')) {
          errorMessage = "AI服务配置异常，请联系中恒创世技术支持：400-888-6666";
        } else if (e.message.includes('429')) {
          errorMessage = "服务繁忙，请稍后重试。";
        } else if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = "网络连接异常，请检查网络后重试。";
        } else {
          errorMessage = `服务错误: ${e.message}`;
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
      // 确保使用保存的API密钥
      const savedApiKey = localStorage.getItem('zhipuApiKey');
      if (savedApiKey) {
        aiService.setZhipuApiKey(savedApiKey);
      }
      
      const audioData = await aiService.generateSpeech(text, project.config.voiceName || 'tongtong', project.config.provider);
      if (audioData) {
        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.play();
      } else {
        console.error('语音生成失败');
      }
    } catch (error) {
      console.error('TTS播放失败:', error);
    }
  };

  const startRecording = async () => {
    try {
      // 检查API密钥是否存在
      const savedApiKey = localStorage.getItem('zhipuApiKey');
      if (!savedApiKey) {
        console.error('语音识别失败: 缺少API密钥');
        setMessages(prev => [...prev, { role: 'assistant', text: '语音识别失败，请联系管理员配置API密钥。' }]);
        return;
      }
      
      // 确保API密钥已设置到AI服务
      aiService.setZhipuApiKey(savedApiKey);
      console.log('API密钥已设置');
      
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
      let errorMessage = '无法访问麦克风，请检查权限设置。';
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许访问。';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = '未找到麦克风设备。';
        } else {
          errorMessage = `录音初始化失败: ${error.message}`;
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', text: errorMessage }]);
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
            // 调用智谱语音识别API
            const transcript = await aiService.recognizeSpeech(base64Audio, project.config.provider);
            if (transcript) {
              // 基于知识库的答案与用户对话，模拟客服
              handleSend(transcript);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', text: '抱歉，我无法识别您的语音，请重试。' }]);
            }
          } catch (error) {
            console.error('语音识别失败:', error);
            setMessages(prev => [...prev, { role: 'assistant', text: '语音识别失败，请检查智谱API密钥是否正确。' }]);
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
  
  // OCR 相关方法
  const showOcrMessage = (type: 'info' | 'success' | 'error', text: string) => {
    setOcrMessage({ type, text });
    setTimeout(() => setOcrMessage({ type: 'info', text: '' }), 3000);
  };
  
  const handleOcrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processOcrImage(file);
    }
  };
  
  const processOcrImage = async (file: File) => {
    try {
      setIsOcrProcessing(true);
      showOcrMessage('info', '正在识别图片中的文字...');
      
      // 显示上传的图片
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setOcrImage(imageUrl);
      };
      reader.readAsDataURL(file);
      
      // 检查API密钥是否存在
      const savedApiKey = localStorage.getItem('zhipuApiKey');
      if (!savedApiKey) {
        console.error('OCR处理失败: 缺少API密钥');
        showOcrMessage('error', 'OCR处理失败，请联系管理员配置API密钥。');
        setIsOcrProcessing(false);
        return;
      }
      
      // 确保API密钥已设置到AI服务
      aiService.setZhipuApiKey(savedApiKey);
      console.log('API密钥已设置');
      
      // 调用 OCR 服务
      const ocrResult = await aiService.recognizeHandwriting(file, {
        languageType: 'CHN_ENG',
        probability: true
      });
      
      if (ocrResult.status === 'succeeded') {
        const recognizedText = ocrResult.words_result
          .map((item: any) => item.words)
          .join('\n');
        
        setOcrResult(recognizedText);
        showOcrMessage('success', 'OCR识别成功');
        
        // 将识别结果发送到聊天
        if (recognizedText) {
          handleSend(`OCR识别结果:\n${recognizedText}`);
        }
      } else {
        showOcrMessage('error', 'OCR识别失败');
      }
    } catch (error) {
      console.error('OCR处理失败:', error);
      showOcrMessage('error', 'OCR处理失败，请检查API密钥是否正确');
    } finally {
      setIsOcrProcessing(false);
    }
  };
  
  const clearOcrResults = () => {
    setOcrResult('');
    setOcrImage(null);
    if (ocrFileInputRef.current) {
      ocrFileInputRef.current.value = '';
    }
  };
  
  const openOcrFilePicker = () => {
    ocrFileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-[#12151b] shadow-2xl relative overflow-hidden font-sans border-x border-white/10">
      {/* Video chat interface */}
      {isVideoChatActive && (
        <div className="absolute inset-0 z-50 bg-[#0a0c10] flex flex-col">
          {/* Video chat header */}
          <header className="bg-[#0f1218]/80 backdrop-blur-3xl p-6 text-white shrink-0 border-b border-white/5 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 purple-gradient-btn rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h1 className="font-black text-lg">{project.name} - 视频客服</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {connectionStatus === 'connected' ? '已连接' : '未连接'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      GLM-Realtime
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={toggleVideoChat} className="p-3 bg-white/5 border border-white/10 rounded-xl text-white">
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Video area */}
          <div className="flex-1 relative bg-black">
            <div className="absolute inset-0 flex items-center justify-center">
              {videoStream ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                    onMouseDown={(e) => {
                      const pressTimer = setTimeout(async () => {
                        // 长按截屏逻辑
                        if (videoRef.current) {
                          const video = videoRef.current;
                          const canvas = document.createElement('canvas');
                          canvas.width = video.videoWidth;
                          canvas.height = video.videoHeight;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            canvas.toBlob(async (blob) => {
                              if (blob) {
                                const file = new File([blob], 'screenshot.png', { type: 'image/png' });
                                // 使用现有的OCR处理函数
                                await processOcrImage(file);
                              }
                            });
                          }
                        }
                      }, 800);
                      // 清除定时器
                      const clearTimer = () => clearTimeout(pressTimer);
                      if (videoRef.current) {
                        videoRef.current.onmouseup = clearTimer;
                        videoRef.current.onmouseleave = clearTimer;
                      }
                    }}
                  />
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full"
                    width={1280}
                    height={720}
                  />
                </>
              ) : (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                    <Video size={48} className="text-violet-400" />
                  </div>
                  <p className="text-white text-lg font-medium">正在初始化视频...</p>
                </div>
              )}
            </div>
            
            {/* Bottom control bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                {/* Video controls */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleVideo} 
                    className={`p-3 rounded-full ${isVideoOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
                  >
                    <Video size={20} />
                  </button>
                  <button 
                    onClick={toggleAudio} 
                    className={`p-3 rounded-full ${isAudioOn ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}
                  >
                    <Mic size={20} />
                  </button>
                  <button className="p-3 bg-white/10 rounded-full text-white">
                    <Camera size={20} />
                  </button>
                </div>
                
                {/* Annotation tools */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => addAnnotation('arrow')} 
                    className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                  >
                    <ArrowRight size={16} />
                  </button>
                  <button 
                    onClick={() => addAnnotation('circle')} 
                    className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                  >
                    <Circle size={16} />
                  </button>
                  <button 
                    onClick={() => addAnnotation('text', '文本标注')} 
                    className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => addAnnotation('highlight')} 
                    className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                  >
                    <Highlighter size={16} />
                  </button>
                </div>
                
                {/* More controls */}
                <div className="flex items-center gap-3">
                  <button className="p-3 bg-white/10 rounded-full text-white">
                    <Volume2 size={20} />
                  </button>
                  <button className="p-3 purple-gradient-btn rounded-full text-white">
                    <Video size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Virtual human and chat area */}
          <div className="w-full h-64 bg-gradient-to-b from-[#1a1d29] to-[#0f1218] flex flex-col">
            {/* Virtual human area */}
            <div className="h-48 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500 via-transparent to-transparent"></div>
              </div>
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles size={40} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-sm">智能助手</h3>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                  {avatarState.expression === 'neutral' ? '就绪' : '对话中'}
                </p>
              </div>
            </div>
            
            {/* Chat input area */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="问我关于此产品的问题..."
                    className="w-full bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button onClick={handleSend} className="absolute right-2 top-1.5 p-2 purple-gradient-btn text-white rounded-lg">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular chat interface */}
      {!isVideoChatActive && (
        <>
          <header className="bg-[#0f1218]/80 backdrop-blur-3xl p-6 text-white shrink-0 border-b border-white/5 z-20">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 purple-gradient-btn rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h1 className="font-black text-lg">{project.name}</h1>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Expert Mode 专家模式
                  </p>
                </div>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl">
                <Sparkles size={18} className="text-red-500" />
              </div>
            </div>
            
            {project.config.videoGuides.filter(v => v.status === 'approved' || !v.status).length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {project.config.videoGuides
                  .filter(v => v.status === 'approved' || !v.status) // 只显示已通过审核的视频，兼容旧数据
                  .map(v => (
                    <button 
                      key={v.id}
                      onClick={() => setActiveVideo(v.url)}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap"
                    >
                      <PlayCircle size={14} className="text-violet-500" /> {v.title}
                    </button>
                  ))
                }
              </div>
            )}
          </header>

          {activeVideo && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6">
              <button onClick={() => setActiveVideo(null)} className="absolute top-8 right-8 text-white p-3 bg-white/10 rounded-full"><X size={28}/></button>
              <video src={activeVideo} controls autoPlay className="w-full rounded-[2rem] shadow-2xl border border-white/10" />
            </div>
          )}

          {/* OCR 消息提示 */}
          {ocrMessage.text && (
            <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
              ocrMessage.type === 'success' ? 'bg-green-900/30 text-green-400' :
              ocrMessage.type === 'error' ? 'bg-red-900/30 text-red-400' :
              'bg-blue-900/30 text-blue-400'
            }`}>
              {ocrMessage.type === 'success' && <CheckCircle size={16} />}
              {ocrMessage.type === 'error' && <AlertCircle size={16} />}
              {ocrMessage.type === 'info' && <FileText size={16} />}
              <span className="text-xs">{ocrMessage.text}</span>
            </div>
          )}
          
          {/* OCR 结果显示 */}
          {ocrImage && (
            <div className="mx-6 mb-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1">
                  <ImageIcon size={14} />
                  OCR 识别结果
                </h4>
                <button
                  onClick={clearOcrResults}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mb-3">
                <img
                  src={ocrImage}
                  alt="OCR Image"
                  className="w-full h-32 object-contain bg-white/5 rounded-xl"
                />
              </div>
              <div>
                <p className="text-xs text-white/80 whitespace-pre-line">
                  {ocrResult || '识别中...'}
                </p>
              </div>
            </div>
          )}
          
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
            
            {/* Streaming message display */}
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

          {/* 手机端优化：输入框单独一行 */}
          <div className="p-4 bg-[#0f1218]/80 backdrop-blur-3xl border-t border-white/5">
            <input
              ref={ocrFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleOcrImageUpload}
              className="hidden"
            />
            
            {/* 功能按钮区 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {project.config.visionEnabled && (
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/5 border border-white/10 rounded-xl text-violet-400">
                    <Camera size={20} />
                  </button>
                )}
                <button
                  onClick={openOcrFilePicker}
                  disabled={isOcrProcessing}
                  className={`p-3 rounded-xl border ${isOcrProcessing ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-white/5 border-white/10 text-violet-400'}`}
                >
                  {isOcrProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </button>
                <button onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-xl border ${isRecording ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-violet-400'}`}>
                  <Mic size={20} />
                </button>
                {project.config.videoChatEnabled && (
                  <button onClick={toggleVideoChat} className="p-3 bg-white/5 border border-white/10 rounded-xl text-violet-400">
                    <Video size={20} />
                  </button>
                )}

              </div>
            </div>
            
            {/* 输入框单独一行 */}
            <div className="relative">
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="问我关于此产品的问题..."
                className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/20 pr-16"
              />
              <button onClick={handleSend} className="absolute right-2 top-2 p-2 purple-gradient-btn text-white rounded-lg">
                <Send size={18} />
              </button>
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { const r = new FileReader(); r.onload = () => handleSend("分析照片 Analyze photo", r.result as string); r.readAsDataURL(f); }
            }} />
          </div>
        </>
      )}
    </div>
  );
};

export default UserPreview;