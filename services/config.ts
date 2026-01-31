// 配置管理服务

// API基础URL配置
export const API_CONFIG = {
  // Vercel 全栈应用，前后端在同一域名下
  BASE_URL: '/api',
};

// 获取完整的API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 获取环境配置
export const getEnvConfig = () => {
  return {
    apiBaseUrl: API_CONFIG.BASE_URL,
  };
};
