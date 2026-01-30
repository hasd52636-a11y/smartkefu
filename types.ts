
export enum ProjectStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  DISABLED = 'disabled'
}

export enum KnowledgeType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
  DOC = 'doc'
}

export enum AIProvider {
  ZHIPU = 'zhipu'    // China
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: KnowledgeType;
  fileName?: string;
  fileSize?: string;
  createdAt: string;
  tags?: string[];
  embedding?: number[];
}

export interface VideoGuide {
  id: string;
  title: string;
  url: string;
  type: 'ai' | 'upload';
  status: 'generating' | 'ready' | 'failed';
}

export interface ProjectConfig {
  provider: AIProvider;
  voiceName: string;
  visionEnabled: boolean;
  visionPrompt: string;
  systemInstruction: string;
  videoGuides: VideoGuide[];
  multimodalEnabled: boolean;
  videoChatEnabled: boolean;
  videoChatPrompt: string;
  avatarEnabled: boolean;
  annotationEnabled: boolean;
}

export interface ProductProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  config: ProjectConfig;
  knowledgeBase: KnowledgeItem[];
  createdAt: string;
  updatedAt: string;
}
