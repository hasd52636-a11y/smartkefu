import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

// 禁用默认的body parser，因为我们需要处理文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ZHIPU_API_KEY) {
    return res.status(401).json({ error: 'No API key configured' });
  }

  try {
    console.log('Processing ASR request...');
    
    // 解析multipart/form-data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const audioFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // 创建FormData发送到智谱API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.filepath));
    formData.append('model', 'whisper-1');

    const response = await axios({
      url: `${ZHIPU_BASE_URL}/audio/transcriptions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        ...formData.getHeaders()
      },
      data: formData,
      timeout: 30000
    });

    // 清理临时文件
    fs.unlinkSync(audioFile.filepath);

    res.json(response.data);
  } catch (error: any) {
    console.error('Zhipu ASR API error:', error.response?.data || error.message);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'ASR request failed';

    res.status(statusCode).json({
      error: errorMessage
    });
  }
}