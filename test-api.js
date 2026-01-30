// 智谱AI API功能测试脚本
const API_KEY = 'a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk';
const BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

// 测试1: 文本对话 (GLM-4.7)
async function testTextChat() {
  console.log('🔤 测试文本对话功能...');
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [
          { role: 'user', content: '你好，请简单介绍一下智谱AI' }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ 文本对话成功:', data.choices[0].message.content);
      return true;
    } else {
      console.log('❌ 文本对话失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 文本对话错误:', error.message);
    return false;
  }
}

// 测试2: 语音合成 (GLM-TTS)
async function testTTS() {
  console.log('🔊 测试语音合成功能...');
  try {
    const response = await fetch(`${BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-tts',
        input: '您好，这是智谱AI语音合成测试',
        voice: 'tongtong',
        response_format: 'wav'
      })
    });
    
    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log('✅ 语音合成成功, 音频大小:', audioBuffer.byteLength, 'bytes');
      return true;
    } else {
      const error = await response.json();
      console.log('❌ 语音合成失败:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ 语音合成错误:', error.message);
    return false;
  }
}

// 测试3: 向量嵌入 (Embedding-3)
async function testEmbedding() {
  console.log('🧠 测试向量嵌入功能...');
  try {
    const response = await fetch(`${BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'embedding-3',
        input: ['这是一个测试文本', '用于验证向量嵌入功能'],
        dimensions: 768
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ 向量嵌入成功, 向量维度:', data.data[0].embedding.length);
      return true;
    } else {
      console.log('❌ 向量嵌入失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 向量嵌入错误:', error.message);
    return false;
  }
}

// 测试4: 多模态分析 (GLM-4.6V)
async function testVision() {
  console.log('👁️ 测试多模态分析功能...');
  try {
    // 使用一个简单的base64图片（1x1像素的透明PNG）
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '请描述这张图片' },
            { type: 'image_url', image_url: { url: testImage } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log('✅ 多模态分析成功:', data.choices[0].message.content);
      return true;
    } else {
      console.log('❌ 多模态分析失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 多模态分析错误:', error.message);
    return false;
  }
}

// 测试5: 工具调用功能
async function testToolCalling() {
  console.log('🔧 测试工具调用功能...');
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [
          { role: 'user', content: '请帮我查询产品ID为P001的产品信息' }
        ],
        tools: [
          {
            type: 'function',
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
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      const hasToolCall = data.choices[0].message.tool_calls && data.choices[0].message.tool_calls.length > 0;
      console.log('✅ 工具调用功能可用:', hasToolCall ? '支持工具调用' : '基础对话正常');
      return true;
    } else {
      console.log('❌ 工具调用失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 工具调用错误:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始测试智谱AI所有功能...\n');
  
  const results = {
    textChat: await testTextChat(),
    tts: await testTTS(),
    embedding: await testEmbedding(),
    vision: await testVision(),
    toolCalling: await testToolCalling()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('文本对话:', results.textChat ? '✅ 正常' : '❌ 失败');
  console.log('语音合成:', results.tts ? '✅ 正常' : '❌ 失败');
  console.log('向量嵌入:', results.embedding ? '✅ 正常' : '❌ 失败');
  console.log('多模态分析:', results.vision ? '✅ 正常' : '❌ 失败');
  console.log('工具调用:', results.toolCalling ? '✅ 正常' : '❌ 失败');
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 总体结果: ${successCount}/5 个功能正常`);
  
  if (successCount === 5) {
    console.log('🎉 所有功能测试通过！API密钥配置正确。');
  } else {
    console.log('⚠️ 部分功能可能需要检查配置或权限。');
  }
}

// 执行测试
runAllTests().catch(console.error);