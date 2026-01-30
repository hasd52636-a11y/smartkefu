
import { KnowledgeItem, AIProvider } from "../types";

const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

// 智谱模型类型
export enum ZhipuModel {
  GLM_4_7 = 'glm-4.7',
  GLM_4_7_FLASH = 'glm-4.7-flash',
  GLM_4_7_FLASHX = 'glm-4.7-flashx',
  GLM_4_6 = 'glm-4.6',
  GLM_4_6V = 'glm-4.6v',
  GLM_4_6V_FLASH = 'glm-4.6v-flash',
  GLM_4_6V_FLASHX = 'glm-4.6v-flashx',
  GLM_4_VOICE = 'glm-4-voice',
  GLM_REALTIME = 'glm-realtime-flash',
  EMBEDDING_3 = 'embedding-3',
  EMBEDDING_2 = 'embedding-2',
  GLM_TTS = 'glm-tts'
}

// 工具类型接口
export interface FunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// 流式回调类型
export type StreamCallback = (chunk: string, isDone: boolean, finishReason?: string) => void;

// GLM-Realtime回调类型
export type RealtimeCallback = (data: any, type: 'audio' | 'video' | 'text' | 'annotation' | 'status') => void;

// 虚拟人状态接口
export interface AvatarState {
  expression: string;
  gesture: string;
  speech: string;
  mouthShape: string;
}

// 标注接口
export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'highlight';
  position: { x: number; y: number; z?: number };
  size: { width: number; height: number };
  content: string;
  color: string;
  timestamp: number;
}

export class AIService {
  private zhipuApiKey: string | undefined;
  private realtimeWebSocket: WebSocket | null = null;
  private realtimeCallbacks: RealtimeCallback[] = [];
  private streamId: string | null = null;
  private isRealtimeConnected: boolean = false;

  // 设置智谱API密钥
  setZhipuApiKey(key: string) {
    this.zhipuApiKey = key;
  }

  // 获取智谱API密钥（优先使用用户设置的密钥，其次使用环境变量）
  private getZhipuApiKey(): string {
    return this.zhipuApiKey || process.env.ZHIPU_API_KEY || process.env.API_KEY || '';
  }

  private async zhipuFetch(endpoint: string, body: any, isBinary: boolean = false) {
    const key = this.getZhipuApiKey();
    const response = await fetch(`${ZHIPU_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'Zhipu API Error');
    }

    return isBinary ? response.arrayBuffer() : response.json();
  }

  // 智谱流式请求
  private async zhipuStreamFetch(endpoint: string, body: any, callback: StreamCallback) {
    const key = this.getZhipuApiKey();
    const response = await fetch(`${ZHIPU_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'Zhipu API Error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              callback('', true, 'stop');
            } else {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                  callback(content, false);
                }
                if (parsed.choices[0]?.finish_reason) {
                  callback('', true, parsed.choices[0].finish_reason);
                }
              } catch (error) {
                console.error('Error parsing SSE chunk:', error);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Enhanced RAG Logic (Retrieval Augmented Generation)
   */
  private retrieveRelevantKnowledge(prompt: string, knowledge: KnowledgeItem[]): KnowledgeItem[] {
    const query = prompt.toLowerCase();
    
    // 计算每个知识项的相关性得分
    const scoredItems = knowledge.map(item => {
      let score = 0;
      
      // 标题匹配得分（权重最高）
      if (item.title.toLowerCase().includes(query)) {
        score += 3.0;
      }
      
      // 内容匹配得分
      if (item.content.toLowerCase().includes(query)) {
        score += 2.0;
      }
      
      // 标签匹配得分
      if (item.tags && item.tags.some(t => t.toLowerCase().includes(query))) {
        score += 1.5;
      }
      
      // 关键词匹配（简单的分词匹配）
      const queryWords = query.split(/\s+/).filter(word => word.length > 1);
      const itemText = `${item.title} ${item.content}`.toLowerCase();
      
      queryWords.forEach(word => {
        if (itemText.includes(word)) {
          score += 0.5;
        }
      });
      
      return { item, score };
    });
    
    // 按得分排序并返回前5个最相关的
    return scoredItems
      .filter(item => item.score > 0) // 只返回有匹配的
      .sort((a, b) => b.score - a.score) // 按得分降序
      .slice(0, 5) // 最多返回5个
      .map(item => item.item); // 提取知识项
  }

  async getSmartResponse(prompt: string, knowledge: KnowledgeItem[], provider: AIProvider, systemInstruction: string, options?: {
    stream?: boolean;
    callback?: StreamCallback;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: FunctionTool[];
    responseFormat?: { type: 'text' | 'json_object' };
  }) {
    try {
      // 1. 向量化用户查询
      const queryEmbedding = await this.createEmbedding(prompt, {
        model: ZhipuModel.EMBEDDING_3,
        dimensions: 768
      });
      
      // 2. 向量化知识库文档（如果尚未向量化）
      const vectorizedKnowledge = await Promise.all(
        knowledge.map(async (item) => {
          if (!item.embedding) {
            const embeddingResult = await this.createEmbedding(item.content, {
              model: ZhipuModel.EMBEDDING_3,
              dimensions: 768
            });
            return { ...item, embedding: embeddingResult.data[0].embedding };
          }
          return item;
        })
      );
      
      // 3. 计算相似度并排序
      const relevantItems = vectorizedKnowledge
        .map(item => ({
          item,
          score: this.cosineSimilarity(
            queryEmbedding.data[0].embedding,
            item.embedding!
          )
        }))
        .filter(item => item.score > 0.3) // 阈值过滤
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // 最多返回5个相关文档
        .map(item => item.item);
      
      // 4. 构建上下文
      const context = relevantItems.length > 0 
        ? relevantItems.map((item, index) => `[Knowledge Item ${index + 1}: ${item.title}]\n${item.content}`).join('\n\n')
        : "No direct match in custom knowledge base. Use general product knowledge if appropriate.";

      const fullPrompt = `You are a product support AI specialized in providing accurate answers based on the provided knowledge base.\n\nIMPORTANT GUIDELINES:\n1. **Strictly use only the information provided in the context** for your answers
2. **Do not invent or assume any information** not explicitly stated in the context
3. **Cite the source** of your information by referencing the knowledge item number
4. **If no relevant information is found**, clearly state that you don't have specific information about the topic\n5. **Be concise and direct** in your responses\n6. **Maintain a professional and helpful tone**\n\nContext:\n${context}\n\nUser Question: ${prompt}`;

      // 仅使用智谱AI实现
      const requestBody = {
        model: options?.model || 'glm-4.7',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: fullPrompt }
        ],
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 1024,
        stream: options?.stream || false,
        tools: options?.tools,
        response_format: options?.responseFormat
      };

      if (options?.stream && options?.callback) {
        await this.zhipuStreamFetch('/chat/completions', requestBody, options.callback);
        return '';
      } else {
        const data = await this.zhipuFetch('/chat/completions', requestBody);
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('向量检索失败，使用传统关键词检索:', error);
      // 回退到传统关键词检索
      const relevantItems = this.retrieveRelevantKnowledge(prompt, knowledge);
      const context = relevantItems.length > 0 
        ? relevantItems.map((item, index) => `[Knowledge Item ${index + 1}: ${item.title}]\n${item.content}`).join('\n\n')
        : "No direct match in custom knowledge base. Use general product knowledge if appropriate.";

      const fullPrompt = `You are a product support AI specialized in providing accurate answers based on the provided knowledge base.\n\nIMPORTANT GUIDELINES:\n1. **Strictly use only the information provided in the context** for your answers
2. **Do not invent or assume any information** not explicitly stated in the context
3. **Cite the source** of your information by referencing the knowledge item number
4. **If no relevant information is found**, clearly state that you don't have specific information about the topic\n5. **Be concise and direct** in your responses\n6. **Maintain a professional and helpful tone**\n\nContext:\n${context}\n\nUser Question: ${prompt}`;

      const requestBody = {
        model: options?.model || 'glm-4.7',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: fullPrompt }
        ],
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 1024,
        stream: options?.stream || false,
        tools: options?.tools,
        response_format: options?.responseFormat
      };

      if (options?.stream && options?.callback) {
        await this.zhipuStreamFetch('/chat/completions', requestBody, options.callback);
        return '';
      } else {
        const data = await this.zhipuFetch('/chat/completions', requestBody);
        return data.choices[0].message.content;
      }
    }
  }

  // 智谱模型多模态分析（支持图片、视频、文件）
  async analyzeMultimodal(content: any[], provider: AIProvider, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    // 仅使用智谱AI实现
    const data = await this.zhipuFetch('/chat/completions', {
      model: options?.model || 'glm-4.6v',
      messages: [{
        role: 'user',
        content: content
      }],
      temperature: options?.temperature || 0.1,
      max_tokens: options?.maxTokens || 1024
    });
    return data.choices[0].message.content;
  }

  // 智谱模型工具调用
  async callTool(functionName: string, args: any, provider: AIProvider) {
    // 仅使用智谱AI实现
    const data = await this.zhipuFetch('/chat/completions', {
      model: 'glm-4.7',
      messages: [{
        role: 'tool',
        content: JSON.stringify(args),
        tool_call_id: `tool_${Date.now()}`
      }],
      temperature: 0.1
    });
    return data.choices[0].message.content;
  }

  // 智谱模型语音识别
  async recognizeSpeech(audioData: string, provider: AIProvider): Promise<string | undefined> {
    if (provider === AIProvider.ZHIPU) {
      try {
        const data = await this.zhipuFetch('/chat/completions', {
          model: 'glm-4-voice',
          messages: [{
            role: 'user',
            content: [
              { type: 'input_audio', input_audio: {
                data: audioData,
                format: 'wav'
              }}
            ]
          }],
          temperature: 0.1
        });
        return data.choices[0].message.content;
      } catch (e) {
        console.error("Zhipu Speech Recognition Failed", e);
        return undefined;
      }
    }

    return undefined;
  }

  // 测试智谱API连接
  async testZhipuConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const data = await this.zhipuFetch('/chat/completions', {
        model: 'glm-4.7',
        messages: [
          { role: 'user', content: 'ping' }
        ],
        temperature: 0.1,
        max_tokens: 10
      });
      return { 
        success: true, 
        message: `Connected to Zhipu AI (${data.model})` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async analyzeInstallation(imageBuffer: string, visionPrompt: string, provider: AIProvider) {
    // 仅使用智谱AI实现
    const data = await this.zhipuFetch('/chat/completions', {
      model: 'glm-4.6v',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: visionPrompt },
          { type: 'image_url', image_url: { url: imageBuffer } }
        ]
      }]
    });
    return data.choices[0].message.content;
  }

  async generateSpeech(text: string, voiceName: string, provider: AIProvider): Promise<string | undefined> {
    // 仅使用智谱AI实现
    try {
      const buffer = await this.zhipuFetch('/audio/speech', {
        model: 'glm-tts',
        input: text,
        voice: voiceName || 'tongtong',
        response_format: 'wav'
      }, true);
      
      const uint8 = new Uint8Array(buffer as ArrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
      return window.btoa(binary);
    } catch (e) {
      console.error("Zhipu TTS Failed", e);
      return undefined;
    }
  }

  async generateVideoGuide(prompt: string, provider: AIProvider) {
    // 仅使用智谱AI实现
    return "https://cdn.bigmodel.cn/static/platform/videos/doc_solutions/Realtime-%E5%94%B1%E6%AD%8C.m4v";
  }

  // GLM-Realtime连接管理
  async connectToRealtime(callback: RealtimeCallback): Promise<boolean> {
    try {
      const key = this.getZhipuApiKey();
      if (!key) {
        console.error('No API key available for GLM-Realtime');
        callback({ error: 'No API key' }, 'status');
        return false;
      }
      
      // GLM-Realtime WebSocket连接，直接在URL中包含认证
      const endpoint = `wss://open.bigmodel.cn/api/paas/v4/realtime?authorization=Bearer ${key}&model=${ZhipuModel.GLM_REALTIME}`;
      
      this.realtimeWebSocket = new WebSocket(endpoint);
      this.realtimeCallbacks.push(callback);
      
      this.realtimeWebSocket.onopen = () => {
        console.log('GLM-Realtime connected');
        this.isRealtimeConnected = true;
        callback({ status: 'connected' }, 'status');
      };
      
      this.realtimeWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'audio':
              callback(data.data, 'audio');
              break;
            case 'video':
              callback(data.data, 'video');
              break;
            case 'text':
              callback(data.data, 'text');
              break;
            case 'annotation':
              callback(data.data, 'annotation');
              break;
            case 'status':
              callback(data.data, 'status');
              break;
            case 'error':
              console.error('GLM-Realtime error:', data.data);
              callback({ error: data.data }, 'status');
              break;
            case 'response.content_part.done':
              // Handle content part done event
              callback({
                ...data,
                type: 'content_part_done'
              }, 'text');
              break;
            case 'response.function_call_arguments.done':
              // Handle function call arguments done event
              callback({
                ...data,
                type: 'function_call_done',
                function_name: data.name,
                function_arguments: data.arguments
              }, 'text');
              break;
            case 'response.function_call.simple_browser':
              callback(data, 'text');
              break;
            case 'response.text.delta':
              callback(data, 'text');
              break;
            case 'response.text.done':
              callback(data, 'text');
              break;
            case 'response.audio_transcript.delta':
              callback(data, 'text');
              break;
            case 'response.audio_transcript.done':
              callback(data, 'text');
              break;
            case 'response.audio.delta':
              callback(data, 'audio');
              break;
            case 'response.audio.done':
              callback(data, 'audio');
              break;
            case 'response.created':
              callback(data, 'status');
              break;
            case 'response.cancelled':
              callback(data, 'status');
              break;
            case 'response.done':
              callback(data, 'status');
              break;
            case 'rate_limits.updated':
              callback(data, 'status');
              break;
            case 'heartbeat':
              callback(data, 'status');
              break;
          }
        } catch (error) {
          console.error('Error parsing realtime message:', error);
        }
      };
      
      this.realtimeWebSocket.onclose = () => {
        console.log('GLM-Realtime disconnected');
        this.isRealtimeConnected = false;
        callback({ status: 'disconnected' }, 'status');
      };
      
      this.realtimeWebSocket.onerror = (error) => {
        console.error('GLM-Realtime connection error:', error);
        callback({ error: 'Connection error' }, 'status');
      };
      
      return true;
    } catch (error) {
      console.error('Failed to connect to GLM-Realtime:', error);
      callback({ error: 'Failed to connect' }, 'status');
      return false;
    }
  }

  // 发送视频帧到GLM-Realtime
  sendVideoFrame(frame: Blob | string) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'video',
        data: {
          frame: typeof frame === 'string' ? frame : frame,
          format: typeof frame === 'string' ? 'base64' : 'blob'
        }
      }));
    } catch (error) {
      console.error('Error sending video frame:', error);
    }
  }

  // 发送音频数据到GLM-Realtime
  sendAudioData(audio: Blob | string) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'audio',
        data: {
          audio: typeof audio === 'string' ? audio : audio,
          format: typeof audio === 'string' ? 'base64' : 'blob'
        }
      }));
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }

  // 发送文本消息到GLM-Realtime
  sendTextMessage(text: string) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'text',
        data: {
          text: text
        }
      }));
    } catch (error) {
      console.error('Error sending text message:', error);
    }
  }

  // 控制虚拟人
  controlAvatar(avatarState: Partial<AvatarState>) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'avatar',
        data: avatarState
      }));
    } catch (error) {
      console.error('Error controlling avatar:', error);
    }
  }

  // 添加标注
  addAnnotation(annotation: Omit<Annotation, 'id' | 'timestamp'>) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      const fullAnnotation = {
        ...annotation,
        id: `annot_${Date.now()}`,
        timestamp: Date.now()
      };
      
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'annotation',
        data: {
          action: 'add',
          annotation: fullAnnotation
        }
      }));
      
      return fullAnnotation;
    } catch (error) {
      console.error('Error adding annotation:', error);
      return null;
    }
  }

  // 更新标注
  updateAnnotation(id: string, updates: Partial<Annotation>) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'annotation',
        data: {
          action: 'update',
          id: id,
          updates: updates
        }
      }));
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
  }

  // 删除标注
  deleteAnnotation(id: string) {
    if (!this.isRealtimeConnected || !this.realtimeWebSocket) {
      console.warn('GLM-Realtime not connected');
      return;
    }
    
    try {
      this.realtimeWebSocket.send(JSON.stringify({
        type: 'annotation',
        data: {
          action: 'delete',
          id: id
        }
      }));
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  }

  // 断开GLM-Realtime连接
  disconnectFromRealtime() {
    if (this.realtimeWebSocket) {
      this.realtimeWebSocket.close();
      this.realtimeWebSocket = null;
      this.isRealtimeConnected = false;
      this.realtimeCallbacks = [];
      this.streamId = null;
      console.log('GLM-Realtime disconnected');
    }
  }

  // 检查GLM-Realtime连接状态
  isRealtimeConnectionActive(): boolean {
    return this.isRealtimeConnected && this.realtimeWebSocket !== null;
  }

  // 向量模型：创建文本嵌入
  async createEmbedding(texts: string | string[], options?: {
    model?: string;
    dimensions?: number;
  }): Promise<any> {
    const requestBody = {
      model: options?.model || ZhipuModel.EMBEDDING_3,
      input: Array.isArray(texts) ? texts : [texts],
      dimensions: options?.dimensions
    };

    const data = await this.zhipuFetch('/embeddings', requestBody);
    return data;
  }

  // 计算向量相似度（余弦相似度）
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  // OCR服务：手写体识别
  async recognizeHandwriting(imageFile: File, options?: {
    languageType?: string;
    probability?: boolean;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('tool_type', 'hand_write');
    formData.append('language_type', options?.languageType || 'CHN_ENG');
    formData.append('probability', String(options?.probability || false));

    const key = this.getZhipuApiKey();
    const response = await fetch(`${ZHIPU_BASE_URL}/files/ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'OCR API Error');
    }

    return response.json();
  }

  // OCR服务：通用文本识别（支持印刷体）
  async recognizeOCR(imageFile: File, options?: {
    languageType?: string;
    probability?: boolean;
  }): Promise<any> {
    return this.recognizeHandwriting(imageFile, options);
  }
}


export const aiService = new AIService();
