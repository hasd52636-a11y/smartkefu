import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ZHIPU_API_KEY) {
    return res.status(401).json({ error: 'No API key configured' });
  }

  try {
    console.log('Proxying TTS request to Zhipu API...');
    
    const response = await axios({
      url: `${ZHIPU_BASE_URL}/audio/speech`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: req.body,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    // 设置正确的响应头
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    res.send(response.data);
  } catch (error: any) {
    console.error('Zhipu TTS API error:', error.response?.data || error.message);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || 
                        error.message || 
                        'TTS request failed';

    res.status(statusCode).json({
      error: errorMessage
    });
  }
}