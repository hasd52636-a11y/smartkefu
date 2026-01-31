# Vercel WebSocket代理方案实施计划

## 一、核心原则

### 1. 安全性
- **绝不**在前端直接使用API密钥
- **必须**通过Vercel API Route生成临时JWT
- **确保**HTTPS环境和加密传输

### 2. 兼容性
- **必须**使用显式的"开启"按钮激活AudioContext
- **分阶段**加载，避免白屏
- **增强**移动端和微信环境兼容

### 3. 调试策略
- **使用**Chrome inspect模式查看移动端Console
- **重点**检查Security Error和Connection Refused
- **环境**检测脚本，提前发现问题

## 二、实施步骤

### 1. 创建Vercel API Routes
- **创建**：`/api/get-token.ts`
- **功能**：生成JWT令牌，保护API密钥
- **安全**：API密钥存储在Vercel环境变量

### 2. 修改前端代码

#### a. UserPreview.tsx修改
- **显式开启按钮**：用于激活AudioContext
- **JWT获取**：调用`/api/get-token`获取令牌
- **WebSocket连接**：使用令牌连接智谱AI
- **视频采样**：隐藏Canvas 10fps采样
- **音频处理**：Float32ToInt16转换

#### b. aiService.ts修改
- **JWT支持**：集成令牌获取和使用
- **音频优化**：支持PCM编码
- **错误处理**：增强移动端兼容

### 3. 实现视频帧传输
- **隐藏Canvas**：300x300像素，10fps采样
- **Base64编码**：JPEG 0.6质量
- **WebSocket发送**：智谱要求的JSON格式

### 4. 优化移动端兼容
- **分阶段加载**：静态内容优先
- **环境检测**：扫码后自动检测
- **权限处理**：用户交互后请求权限
- **微信兼容**：添加微信环境检测

### 5. 测试验证
- **环境检测**：HTTPS、麦克风、摄像头
- **连接测试**：WebSocket稳定性
- **功能测试**：语音、视频、文本对话
- **兼容性测试**：不同设备和浏览器

## 三、关键技术实现

### 1. Vercel API Routes
```typescript
// /api/get-token.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { productId } = req.query;
  const API_KEY = process.env.ZHIPU_API_KEY;

  if (!API_KEY) {
    return res.status(401).json({ error: "商家未配置密钥" });
  }

  try {
    const [id, secret] = API_KEY.split('.');
    const payload = {
      api_key: id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, secret, { 
      algorithm: 'HS256', 
      header: { alg: 'HS256', sign_type: 'SIGN' } 
    });

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: "Token生成失败" });
  }
}
```

### 2. 前端核心逻辑
```typescript
// UserPreview.tsx
const initializeChat = async () => {
  try {
    // 1. 激活AudioContext（必须用户点击触发）
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    
    // 2. 获取JWT令牌
    const res = await fetch(`/api/get-token?productId=${projectId}`);
    if (!res.ok) {
      throw new Error('获取令牌失败');
    }
    const { token } = await res.json();

    // 3. 建立WebSocket连接
    const url = `wss://open.bigmodel.cn/api/paas/v4/realtime?Authorization=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log("已连接到AI客服");
      startStreaming();
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: '连接失败，请检查网络后重试' 
      }]);
    };

  } catch (error) {
    console.error('初始化失败:', error);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      text: '初始化失败，请检查网络后重试' 
    }]);
  }
};

const startStreaming = async () => {
  try {
    // 4. 获取媒体权限
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 480 },
      audio: true
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    // 5. 视频采样：10fps
    const sendVideoFrame = () => {
      if (canvasRef.current && videoRef.current && ws.current?.readyState === WebSocket.OPEN) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 300, 300);
          const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.6);
          
          ws.current.send(JSON.stringify({
            type: "video_frame",
            data: base64Image.split(',')[1]
          }));
        }
      }
      requestAnimationFrame(() => setTimeout(sendVideoFrame, 100));
    };
    sendVideoFrame();

  } catch (error) {
    console.error('获取媒体失败:', error);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      text: '获取摄像头权限失败，请检查设备设置' 
    }]);
  }
};
```

### 3. 音频处理
```typescript
// 音频转换函数
function convertFloat32ToInt16(buffer: Float32Array) {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf.buffer;
}

// 音频流处理
const startAudioProcessing = async () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = convertFloat32ToInt16(inputData);
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: "audio_frame",
          data: Array.from(new Uint8Array(pcmData))
        }));
      }
    };
    
    source.connect(processor);
    processor.connect(audioCtx.destination);

  } catch (error) {
    console.error('音频处理失败:', error);
  }
};
```

## 四、环境检测脚本

```typescript
// 环境检测脚本
const checkEnvironment = async () => {
  const results = {
    https: window.location.protocol === 'https:',
    mediaDevices: navigator.mediaDevices !== undefined,
    audioContext: window.AudioContext !== undefined,
    websocket: window.WebSocket !== undefined,
    canvas: document.createElement('canvas').getContext('2d') !== null
  };

  console.log('环境检测结果:', results);

  // 显示检测结果
  const issues = [];
  if (!results.https) issues.push('需要HTTPS环境');
  if (!results.mediaDevices) issues.push('不支持媒体设备');
  if (!results.audioContext) issues.push('不支持AudioContext');
  if (!results.websocket) issues.push('不支持WebSocket');
  if (!results.canvas) issues.push('不支持Canvas');

  if (issues.length > 0) {
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      text: `环境检测发现问题: ${issues.join(', ')}` 
    }]);
    return false;
  }

  return true;
};
```

## 五、修改范围

### 1. 需要修改的文件
- **新增**：`/api/get-token.ts` - JWT令牌生成
- **修改**：`components/UserPreview.tsx` - 核心逻辑
- **修改**：`services/aiService.ts` - API调用
- **修改**：`package.json` - 添加jwt依赖

### 2. 保持不变的文件
- **components/ProjectDetail.tsx** - 商家后台配置
- **services/projectService.ts** - 项目验证
- **App.tsx** - 路由配置
- **UI组件** - 保持原有结构

## 六、测试计划

### 1. 环境测试
- **HTTPS检测**：确保HTTPS环境
- **权限检测**：测试麦克风和摄像头权限
- **浏览器兼容**：测试主流移动浏览器
- **微信环境**：测试微信内置浏览器

### 2. 功能测试
- **语音对话**：测试实时语音识别
- **视频客服**：测试视频帧传输
- **文本对话**：测试SSE流式输出
- **OCR功能**：测试图片分析

### 3. 调试策略
- **Chrome inspect**：查看移动端Console
- **网络面板**：检查WebSocket连接
- **错误处理**：测试各种错误场景

## 七、预期效果

### 1. 功能完整性
- ✅ 实时语音对话
- ✅ 视频客服功能
- ✅ 文本对话（SSE）
- ✅ OCR/图片分析
- ✅ 移动端兼容

### 2. 安全性
- ✅ API密钥保护
- ✅ JWT令牌验证
- ✅ HTTPS加密传输
- ✅ 权限控制

### 3. 兼容性
- ✅ 显式激活AudioContext
- ✅ 分阶段加载
- ✅ 移动端兼容
- ✅ 微信环境支持

## 八、部署检查清单

### 1. Vercel配置
- [ ] 设置API密钥环境变量
- [ ] 配置API Routes
- [ ] 设置合适的Region

### 2. 前端检查
- [ ] 显式的"开启"按钮
- [ ] JWT令牌获取逻辑
- [ ] 环境检测脚本
- [ ] 错误处理机制

### 3. 安全检查
- [ ] 无直接API密钥使用
- [ ] HTTPS环境
- [ ] 加密传输
- [ ] 令牌过期处理

### 4. 功能检查
- [ ] 语音对话
- [ ] 视频客服
- [ ] 文本对话
- [ ] OCR功能

此计划将确保在Vercel架构下实现安全、稳定、兼容的实时语音和视频功能，满足扫码即用的业务需求。