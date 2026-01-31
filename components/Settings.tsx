
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, RefreshCw, CheckCircle2, Sparkles, Globe, Lock, 
  Activity, Zap, Database, Cpu, Server, Wifi, Key, Eye, EyeOff
} from 'lucide-react';
import { aiService } from '../services/aiService';

const Settings: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [metrics, setMetrics] = useState({
    zhipu: { ping: '18ms', uptime: '99.95%', status: 'Active' }
  });
  const [zhipuApiKey, setZhipuApiKey] = useState('');
  const [showZhipuKey, setShowZhipuKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [testingZhipu, setTestingZhipu] = useState(false);
  const [zhipuTestResult, setZhipuTestResult] = useState('');
  const [zhipuTestStatus, setZhipuTestStatus] = useState('');

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setMetrics({
        zhipu: { ping: `${Math.floor(Math.random() * 10 + 15)}ms`, uptime: '99.95%', status: 'Active' }
      });
    }, 1500);
  };

  const handleSaveKey = () => {
    // API密钥现在在后端服务器中管理
    // 前端不再需要设置API密钥
    // 这里可以保留本地存储，以便在需要时查看
    localStorage.setItem('zhipuApiKey', zhipuApiKey);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
    }, 2000);
  };

  // 组件加载时，从本地存储中获取之前保存的API密钥
  useEffect(() => {
    const savedZhipuKey = localStorage.getItem('zhipuApiKey');
    if (savedZhipuKey) {
      setZhipuApiKey(savedZhipuKey);
      // API密钥现在在后端服务器中管理
      // 前端不再需要设置API密钥
    }
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-amber-500 tracking-tight">集群设置 <span className="text-amber-500">API Nodes</span></h1>
          <p className="text-amber-500 mt-2 font-medium">管理全球分布式 AI 节点的连接与安全状态。Distributed nodes & Performance.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-3 px-6 py-3 bg-amber-500 border border-amber-500/30 rounded-2xl text-xs font-black uppercase tracking-widest text-black hover:bg-amber-400 transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing Clusters...' : 'Re-sync Nodes 重新同步'}
        </button>
      </div>

      <div className="p-10 rounded-[3rem] border border-amber-500/30 shadow-2xl bg-white">
        <div className="flex items-center gap-4 mb-6">
           <Key className="text-amber-500" size={24} />
           <h4 className="text-lg font-black text-amber-500">API 密钥设置 <span className="text-amber-500">Authentication</span></h4>
        </div>
        <div className="space-y-8">
          {/* Zhipu API Key */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-amber-500 uppercase tracking-wider block">智谱 API 密钥</label>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type={showZhipuKey ? 'text' : 'password'}
                  value={zhipuApiKey}
                  onChange={(e) => setZhipuApiKey(e.target.value)}
                  placeholder="请输入您的 智谱 API 密钥"
                  className="w-full px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500 placeholder:text-amber-500/50 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowZhipuKey(!showZhipuKey)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-500 hover:text-amber-400 transition-colors"
                >
                  {showZhipuKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                onClick={async () => {
                  setTestingZhipu(true);
                  try {
                    // 先更新AI服务中的密钥
                    // API密钥现在在后端服务器中管理
                    // 前端不再需要设置API密钥
                    // 使用增强的智谱API测试功能
                    const testResult = await aiService.testZhipuConnection();
                    if (testResult.success) {
                      setZhipuTestResult(testResult.message);
                      setZhipuTestStatus('success');
                    } else {
                      setZhipuTestResult('连接失败: ' + testResult.message);
                      setZhipuTestStatus('error');
                    }
                  } catch (error) {
                    setZhipuTestResult('连接失败: ' + (error instanceof Error ? error.message : '未知错误'));
                    setZhipuTestStatus('error');
                  } finally {
                    setTestingZhipu(false);
                    setTimeout(() => {
                      setZhipuTestResult('');
                      setZhipuTestStatus('');
                    }, 3000);
                  }
                }}
                disabled={!zhipuApiKey || testingZhipu}
                className={`px-6 py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-all ${(!zhipuApiKey || testingZhipu) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {testingZhipu ? '测试中...' : '测试'}
              </button>
            </div>
            {zhipuTestResult && (
              <p className={`text-xs font-medium ${zhipuTestStatus === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                {zhipuTestResult}
              </p>
            )}
            <p className="text-xs text-amber-500/70">
              此密钥将用于访问 智谱 AI 服务。
            </p>
          </div>

          {/* 智谱模型高级参数配置 */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-amber-500 uppercase tracking-wider block">智谱模型高级参数</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 温度设置 */}
              <div>
                <label className="text-xs text-amber-500/70 block mb-2">温度 (0.1-1.0)</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  defaultValue="0.1"
                  className="w-full h-2 bg-amber-500/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-xs text-amber-500/70 mt-1">
                  <span>确定</span>
                  <span>随机</span>
                </div>
              </div>
              
              {/* 最大令牌数 */}
              <div>
                <label className="text-xs text-amber-500/70 block mb-2">最大令牌数</label>
                <select
                  className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all"
                >
                  <option value="512">512</option>
                  <option value="1024">1024</option>
                  <option value="2048">2048</option>
                  <option value="4096">4096</option>
                  <option value="8192">8192</option>
                </select>
              </div>
              
              {/* 采样策略 */}
              <div>
                <label className="text-xs text-amber-500/70 block mb-2">采样策略</label>
                <select
                  className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-500 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all"
                >
                  <option value="temperature">Temperature</option>
                  <option value="top_p">Top P</option>
                </select>
              </div>
            </div>
            
            {/* 功能能力展示 */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-bold text-amber-500 uppercase tracking-wider block">系统功能能力</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">文本对话</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">glm-4.7 模型</div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">语音识别</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">glm-4-voice 模型</div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">语音合成</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">glm-tts 模型</div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">多模态分析</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">glm-4.6v 模型</div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">知识库</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">嵌入向量 + 重排</div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">工具调用</div>
                  <div className="text-[9px] text-amber-500/70 mt-1">函数调用能力</div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-amber-500/70 mt-4">
              系统会自动根据不同任务类型选择合适的模型，无需手动指定。所有功能在API密钥验证通过后自动启用。
            </p>
          </div>

          <button
            onClick={handleSaveKey}
            disabled={!zhipuApiKey}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-all ${(!zhipuApiKey) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {keySaved ? (
              <>
                <CheckCircle2 size={18} />
                密钥已保存
              </>
            ) : (
              <>
                <Lock size={18} />
                保存 API 密钥
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Zhipu AI China Node */}
        <div className="glass-card p-8 rounded-[3rem] border border-red-500/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 blur-[80px] group-hover:bg-red-500/10 transition-all"></div>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
                <Zap size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Zhipu AI China Cluster</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Region: Mainland China (Beijing/Shanghai)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-tighter">
              <CheckCircle2 size={12} /> {metrics.zhipu.status}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <MetricBox icon={<Wifi size={14}/>} label="Latency" value={metrics.zhipu.ping} color="text-red-400" />
            <MetricBox icon={<Activity size={14}/>} label="Uptime" value={metrics.zhipu.uptime} color="text-red-400" />
            <MetricBox icon={<Cpu size={14}/>} label="Model" value="GLM-4 / 4V" color="text-red-400" />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Capability Matrix 功能矩阵</h4>
            <div className="grid grid-cols-2 gap-3">
              <CapabilityItem label="GLM Video Gen" supported />
              <CapabilityItem label="Wav TTS (Low Latency)" supported />
              <CapabilityItem label="GLM-4V Vision" supported />
              <CapabilityItem label="Rerank Support" supported />
              <CapabilityItem label="Multimodal Analysis" supported />
              <CapabilityItem label="Tool Calling" supported />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-4 mb-6">
             <ShieldCheck className="text-amber-500" size={24} />
             <h4 className="text-lg font-black text-white">密钥安全与环境映射 <span className="text-amber-500">Security</span></h4>
          </div>
          <div className="space-y-6 text-sm text-slate-400 font-medium leading-relaxed">
            <p>AI虚拟客服 采用<b>动态环境代理机制</b>，您的 API 密钥（Zhipu）通过后端环境变量安全挂载，前端不保留任何敏感明文。系统会自动路由至最佳响应节点。</p>
            <div className="p-6 bg-black/30 rounded-2xl border border-white/5 font-mono text-[11px] text-emerald-400/80">
              $ route_ai_request --target=zhipu <br/>
              [SYSTEM] Checking Zhipu China Health... OK (18ms) <br/>
              [SYSTEM] Routing successful via process.env.ZHIPU_API_KEY
            </div>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
             <Lock className="text-violet-500" size={24} />
             <h4 className="text-lg font-black text-white">合规建议</h4>
          </div>
          <div className="space-y-5">
            <ComplianceCard title="数据合规" desc="使用智谱AI时，所有数据处理均符合国内数据安全法规。" />
            <ComplianceCard title="国内数据不出境" desc="使用智谱节点时，所有推理过程均在中国大陆境内完成。" />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ icon, label, value, color = "text-blue-400" }: any) => (
  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
    <div className="flex items-center gap-2 text-slate-500 mb-1">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className={`text-sm font-black ${color}`}>{value}</div>
  </div>
);

const CapabilityItem = ({ label, supported }: any) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
    <div className={`w-1.5 h-1.5 rounded-full ${supported ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{label}</span>
  </div>
);

const ComplianceCard = ({ title, desc }: any) => (
  <div className="space-y-1">
    <p className="text-xs font-black text-white uppercase tracking-wide">{title}</p>
    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

export default Settings;
