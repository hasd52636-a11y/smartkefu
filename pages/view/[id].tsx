import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { ProductProject } from '../../types';
import UserPreview from '../../components/UserPreview';

// 模拟项目数据
const mockProjects: ProductProject[] = [
  {
    id: 'p1',
    name: '测试项目',
    description: '用于测试扫码功能的项目。',
    status: 'active' as any,
    config: {
      provider: 'zhipu' as any,
      voiceName: 'tongtong',
      visionEnabled: true,
      visionPrompt: '请分析安装照片，检查产品安装是否正确。',
      systemInstruction: '您是专业的产品技术支持专家。',
      videoGuides: [],
      multimodalEnabled: true,
      videoChatEnabled: true,
      videoChatPrompt: '您是专业技术支持专家。',
      avatarEnabled: true,
      annotationEnabled: true
    },
    knowledgeBase: [
      { 
        id: 'k1', 
        title: '使用说明', 
        type: 'text' as any, 
        content: '这是一个测试项目，用于验证扫码功能是否正常工作。', 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 'k2', 
        title: '测试内容', 
        type: 'text' as any, 
        content: '扫码成功！您可以开始使用AI虚拟客服功能了。', 
        createdAt: new Date().toISOString() 
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'proj_1',
    name: 'SmartHome Pro Hub',
    description: 'Next-gen automation controller for modern homes.',
    status: 'active' as any,
    config: {
      provider: 'zhipu' as any,
      voiceName: 'tongtong',
      visionEnabled: true,
      visionPrompt: 'Check if all cables are plugged in and the LED is glowing green.',
      systemInstruction: 'You are a technical support expert for SmartHome Pro products.',
      videoGuides: [],
      multimodalEnabled: true,
      videoChatEnabled: true,
      videoChatPrompt: '您是SmartHome Pro系列产品的专业技术支持专家。',
      avatarEnabled: true,
      annotationEnabled: true
    },
    knowledgeBase: [
      { 
        id: 'k1', 
        title: 'Initial Setup', 
        type: 'text' as any, 
        content: 'Plug in the device and wait 60 seconds.', 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 'k2', 
        title: 'Connection Guide', 
        type: 'text' as any, 
        content: '1. Download the SmartHome app\n2. Create an account\n3. Follow the in-app setup instructions', 
        createdAt: new Date().toISOString() 
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function ViewProject() {
  const router = useRouter();
  const { id } = router.query;
  const [projects] = useState<ProductProject[]>(mockProjects);

  return <UserPreview projects={projects} />;
}