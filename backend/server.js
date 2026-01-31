require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3002;

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 配置CORS
app.use(cors({
  origin: '*', // 生产环境中应该设置具体的域名
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(express.json());
// 解析URL编码请求体
app.use(express.urlencoded({ extended: true }));

// 获取API密钥（优先使用环境变量，其次使用配置文件）
function getApiKey() {
  return process.env.ZHIPU_API_KEY || process.env.API_KEY || '';
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// 知识库数据（模拟）
const knowledgeBases = {
  'p1': [
    { id: 'k1', title: '矿泉水使用指南', content: '这是矿泉水使用指南，包含产品说明和使用方法。' },
    { id: 'k2', title: '产品规格', content: '矿泉水规格：500ml/瓶，主要成分包括水、矿物质等。' }
  ],
  'proj_1': [
    { id: 'k1', title: 'SmartHome Pro Hub 使用说明', content: 'SmartHome Pro Hub 是下一代智能家居控制器，用于管理家庭智能设备。' },
    { id: 'k2', title: '安装指南', content: '安装步骤：1. 连接电源 2. 连接网络 3. 下载APP 4. 配对设备' },
    { id: 'k3', title: '故障排除', content: '常见问题：无法连接网络 - 检查路由器设置；设备无响应 - 重启Hub。' }
  ]
};

// 系统提示词模板
const systemPromptTemplate = (productName) => `
你是「${productName}」的专业技术支持专家。请基于以下知识库内容，为用户提供准确、详细的解答。

重要要求：
1. 严格基于知识库内容回答，不要编造信息
2. 使用专业但易懂的语言
3. 提供具体的操作步骤
4. 引用知识库中的相关内容
5. 保持友好、耐心的服务态度

如果知识库中没有相关信息，请明确告知用户，并提供一般性建议。

产品知识库：
`;

// 知识库检索函数
const retrieveKnowledge = (projectId, query) => {
  const knowledgeBase = knowledgeBases[projectId] || [];
  if (!knowledgeBase.length) {
    return [];
  }

  // 简单的关键词匹配（实际项目中应使用向量模型）
  return knowledgeBase.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.content.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3); // 最多返回3个相关条目
};

// 构建上下文
const buildContext = (projectId, query) => {
  const knowledge = retrieveKnowledge(projectId, query);
  const productName = projectId === 'p1' ? '矿泉水使用指南' : 'SmartHome Pro Hub';
  
  let context = systemPromptTemplate(productName);
  
  if (knowledge.length) {
    knowledge.forEach((item, index) => {
      context += `[知识库条目 ${index + 1}: ${item.title}]\n${item.content}\n\n`;
    });
  } else {
    context += '暂无相关知识库内容\n\n';
  }
  
  context += `用户问题：${query}`;
  return context;
};

// 文本聊天API
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const { projectId, message } = req.body;
    
    if (!projectId || !message) {
      return res.status(400).json({ error: 'Missing projectId or message' });
    }

    console.log('Processing chat request:', projectId, message);

    // 构建上下文
    const context = buildContext(projectId, message);
    console.log('Built context:', context.substring(0, 200) + '...');

    // 调用Zhipu API
    const response = await axios({
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'glm-4.7',
        messages: [
          { role: 'system', content: '你是专业的产品技术支持专家' },
          { role: 'user', content: context }
        ],
        temperature: 0.1,
        max_tokens: 1024
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Chat API error' });
  }
});

// 图片分析API
app.post('/api/analyze', async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const { projectId, imageUrl, prompt } = req.body;
    
    if (!projectId || !imageUrl) {
      return res.status(400).json({ error: 'Missing projectId or imageUrl' });
    }

    console.log('Processing image analysis:', projectId);

    // 调用Zhipu API进行图片分析
    const response = await axios({
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt || '请分析图片内容' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 1024
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Image analysis error' });
  }
});

// 视频聊天API
app.post('/api/video', async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const { projectId, videoUrl, prompt } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    console.log('Processing video chat:', projectId);

    // 构建上下文
    const context = buildContext(projectId, prompt || '分析视频内容');

    // 调用Zhipu API（实际项目中应使用视频分析模型）
    const response = await axios({
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'glm-4.7',
        messages: [
          { role: 'system', content: '你是专业的视频分析专家' },
          { role: 'user', content: context }
        ],
        temperature: 0.1,
        max_tokens: 1024
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Video chat error:', error);
    res.status(500).json({ error: 'Video chat error' });
  }
});

// Zhipu API代理
app.post('/api/zhipu/*', async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const endpoint = req.params[0];
    const url = `https://open.bigmodel.cn/api/paas/v4/${endpoint}`;
    
    console.log('Proxying request to:', url);
    
    const response = await axios({
      url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: req.body,
      responseType: 'stream'
    });

    // 检查是否是SSE流式响应
    if (response.headers['content-type']?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // 流式传输响应
      response.data.pipe(res);
      
      response.data.on('end', () => {
        res.end();
      });
    } else {
      // 非流式响应，正确处理流数据
        try {
          const chunks = [];
          for await (const chunk of response.data) {
            chunks.push(chunk);
          }
          const data = Buffer.concat(chunks);
          
          // 检查是否是二进制音频数据（TTS响应）
          if (endpoint.includes('audio/speech')) {
            // 直接返回二进制数据
            res.setHeader('Content-Type', 'audio/wav');
            res.send(data);
          } else {
            // 尝试解析为JSON
            try {
              const jsonData = JSON.parse(data.toString());
              res.json(jsonData);
            } catch (jsonError) {
              // 如果不是JSON，可能是其他二进制数据
              console.error('Non-JSON response for endpoint:', endpoint);
              res.send(data);
            }
          }
        } catch (parseError) {
          console.error('Error processing response:', parseError);
          res.status(500).json({ error: 'Error processing API response' });
        }
    }
  } catch (error) {
    console.error('Zhipu API proxy error:', error);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    console.error('Error message:', error.message);
    
    // 尝试解析错误响应
    let errorMessage = 'API proxy error';
    
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        try {
          const parsedError = JSON.parse(error.response.data);
          errorMessage = parsedError.error?.message || parsedError.message || errorMessage;
        } catch (parseError) {
          errorMessage = error.response.data;
        }
      } else if (error.response.data.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('Final error message:', errorMessage);
    
    res.status(error.response?.status || 500).json({
      error: errorMessage
    });
  }
});

// 文件上传和OCR处理
app.post('/api/ocr', upload.single('file'), async (req, res) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));
    formData.append('tool_type', req.body.tool_type || 'hand_write');
    formData.append('language_type', req.body.language_type || 'CHN_ENG');
    formData.append('probability', req.body.probability || 'false');

    const response = await axios({
      url: 'https://open.bigmodel.cn/api/paas/v4/files/ocr',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      data: formData
    });

    // 清理上传的文件
    fs.unlinkSync(req.file.path);

    res.json(response.data);
  } catch (error) {
    console.error('OCR processing error:', error.response?.data || error.message);
    
    // 清理上传的文件
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || error.message || 'OCR processing error'
    });
  }
});

// 静态文件服务（用于部署前端）
app.use(express.static(path.join(__dirname, '../dist')));

// 处理所有其他路由，返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`API proxy available at http://0.0.0.0:${PORT}/api/zhipu`);
  console.log(`Health check at http://0.0.0.0:${PORT}/api/health`);
});

// 导出app（用于测试）
module.exports = app;