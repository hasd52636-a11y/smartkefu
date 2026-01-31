// 配置管理服务

// API基础URL配置
// 在生产环境中，需要设置为后端服务器的公网地址
export const API_CONFIG = {
  // 本地开发环境：通过Vite代理连接到本地后端
  // 生产环境（Vercel）：需要设置为后端服务器的公网地址
  // 注意：如果后端在本地电脑，需要使用内网穿透工具暴露到公网
  BASE_URL: '/api',
  
  // 后端服务配置
  BACKEND: {
    PORT: 3002,
    HOST: 'localhost'
  },
  
  // 前端服务配置
  FRONTEND: {
    PORT: 3001,
    HOST: 'localhost'
  }
};

// 获取完整的API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 检查是否为生产环境
export const isProduction = () => {
  return import.meta.env.PROD;
};

// 获取环境配置
export const getEnvConfig = () => {
  return {
    isProduction: isProduction(),
    apiBaseUrl: API_CONFIG.BASE_URL,
    backendHost: API_CONFIG.BACKEND.HOST,
    backendPort: API_CONFIG.BACKEND.PORT
  };
};
