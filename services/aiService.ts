import { KnowledgeItem, AIProvider } from "../types";
import { getApiUrl } from "./config";

// 智谱模型类型
export enum ZhipuModel {
  GLM_4_7 = 'glm-4.7',
  GLM_4_7_FLASH = 'glm-4.7-flash',
  GLM_TTS = 'glm-tts'
}

// 流式回调类型
export type StreamCallback = (chunk: string, isDone: boolean, finishReason?: string) => void;

export class AIService {
  private async zhipuFetch(endpoint: string, body: any, isBinary: boolean = false) {
    try {
      const response = await fetch(getApiUrl(`/zhipu${endpoint}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (isBinary) {
        return await response.arrayBuffer();
      } else {
        return await response.json();
      }
    } catch (error) {
      console.error('Zhipu API request failed:', error);
      throw error;
    }
  }

  private async zhipuStreamFetch(endpoint: string, body: any, callback: StreamCallback) {
    try {
      const response = await fetch(getApiUrl(`/zhipu${endpoint}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callback('', true);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                callback(content, false);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream fetch failed:', error);
      callback('', true);
      throw error;
    }
  }

  async getSmartResponse(prompt: string, knowledge: KnowledgeItem[], provider: AIProvider, systemInstruction: string, options?: {
    stream?: boolean;
    callback?: StreamCallback;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    try {
      if (typeof prompt !== 'string') {
        console.warn('Invalid prompt type, using empty string instead:', typeof prompt);
        prompt = '';
      }
      
      if (!Array.isArray(knowledge)) {
        console.warn('Invalid knowledge type, using empty array instead:', typeof knowledge);
        knowledge = [];
      }
      
      // 简化的知识库处理 - 直接使用前3个相关文档
      const relevantItems = knowledge.slice(0, 3);
      
      // 构建上下文
      const context = relevantItems.length > 0 
        ? relevantItems.map((item, index) => `[Knowledge Item ${index + 1}: ${item.title}]\n${item.content}`).join('\n\n')
        : "No direct match in custom knowledge base. Use general product knowledge if appropriate.";

      const fullPrompt = `You are a product support AI specialized in providing accurate answers based on the provided knowledge base.\n\nContext:\n${context}\n\nUser Question: ${prompt}`;

      const requestBody = {
        model: options?.model || 'glm-4.7',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: fullPrompt }
        ],
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 1024,
        stream: options?.stream || false
      };

      if (options?.stream && options?.callback) {
        await this.zhipuStreamFetch('/chat/completions', requestBody, options.callback);
        return '';
      } else {
        const data = await this.zhipuFetch('/chat/completions', requestBody);
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Smart response failed:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voice: string = 'tongtong', provider: AIProvider = 'zhipu' as any): Promise<string | null> {
    try {
      const requestBody = {
        model: 'glm-tts',
        input: text,
        voice: voice,
        response_format: 'wav'
      };

      const audioBuffer = await this.zhipuFetch('/audio/speech', requestBody, true);
      
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(audioBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('Speech generation failed:', error);
      return null;
    }
  }

  async recognizeSpeech(audioData: string, provider: AIProvider = 'zhipu' as any): Promise<string | null> {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(audioData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'whisper-1');

      const response = await fetch(getApiUrl('/zhipu/audio/transcriptions'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text || null;
    } catch (error) {
      console.error('Speech recognition failed:', error);
      return null;
    }
  }

  async analyzeInstallation(imageData: string, prompt: string, provider: AIProvider = 'zhipu' as any): Promise<string> {
    try {
      const requestBody = {
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt || '请分析图片内容' },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 1024
      };

      const data = await this.zhipuFetch('/chat/completions', requestBody);
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw error;
    }
  }

  // 简化的方法存根
  async generateVideoGuide(prompt: string, provider: AIProvider): Promise<string> {
    console.log('Video generation requested:', prompt);
    return 'https://example.com/generated-video.mp4';
  }

  async recognizeHandwriting(imageFile: File): Promise<any> {
    console.log('OCR requested for file:', imageFile.name);
    return { status: 'succeeded', words_result: [{ words: 'OCR功能暂未实现' }] };
  }

  async analyzeMultimodal(messages: any[], provider: AIProvider): Promise<string> {
    try {
      const requestBody = {
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: messages
        }],
        temperature: 0.1,
        max_tokens: 1024
      };

      const data = await this.zhipuFetch('/chat/completions', requestBody);
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Multimodal analysis failed:', error);
      throw error;
    }
  }

  async testZhipuConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.getSmartResponse(
        '测试连接', 
        [], 
        'zhipu' as any, 
        '你是一个测试助手，请回复"连接成功"',
        { model: 'glm-4.7-flash', temperature: 0.1, maxTokens: 50 }
      );
      
      return {
        success: true,
        message: '智谱API连接成功！' + (response ? ` 响应: ${response}` : '')
      };
    } catch (error) {
      console.error('Zhipu connection test failed:', error);
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  setZhipuApiKey(key: string) {
    // API密钥现在在后端管理，前端不需要设置
    console.log('API key management moved to backend');
  }
}

export const aiService = new AIService();