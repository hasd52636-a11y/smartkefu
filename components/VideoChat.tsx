import React from 'react';
import { Video } from 'lucide-react';

const VideoChat: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a103d] to-[#2d1b69] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] border-2 border-violet-500/30 p-8 shadow-2xl text-center">
        <div className="w-20 h-20 bg-violet-500/20 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Video size={40} />
        </div>
        <h1 className="text-2xl font-black text-violet-800 mb-4">视频聊天功能</h1>
        <p className="text-slate-600">视频聊天功能正在开发中...</p>
      </div>
    </div>
  );
};

export default VideoChat;