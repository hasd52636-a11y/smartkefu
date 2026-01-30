
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Users, Clock, ThumbsUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

// 获取当前月份的名称
const getCurrentMonthName = (index: number) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[index % 12];
};

// 生成最近6个月的月份数据
const generateRecentMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const monthIndex = now.getMonth() - 5 + index;
    return getCurrentMonthName(monthIndex);
  });
};

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState({
    uniqueUsers: 0,
    avgHelpTime: 0,
    csatScore: 0,
    bypassRate: 0,
    serviceTypeData: [],
    issueDistribution: [
      { name: 'Installation', value: 0 },
      { name: 'WIFI Setup', value: 0 },
      { name: 'Hardware', value: 0 },
      { name: 'Others', value: 0 },
    ]
  });

  // 初始化或重置分析数据
  const initializeAnalyticsData = () => {
    const recentMonths = generateRecentMonths();
    const serviceTypeData = recentMonths.map(month => ({
      name: month,
      proactive: 0,
      reactive: 0
    }));

    return {
      uniqueUsers: 0,
      avgHelpTime: 0,
      csatScore: 0,
      bypassRate: 0,
      serviceTypeData,
      issueDistribution: [
        { name: 'Installation', value: 0 },
        { name: 'WIFI Setup', value: 0 },
        { name: 'Hardware', value: 0 },
        { name: 'Others', value: 0 },
      ]
    };
  };

  // 从本地存储加载分析数据
  useEffect(() => {
    const loadAnalyticsData = () => {
      const savedData = localStorage.getItem('smartguide_analytics');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setAnalyticsData(parsedData);
        } catch (error) {
          console.error('Error parsing analytics data:', error);
          // 如果解析失败，初始化数据
          const initialData = initializeAnalyticsData();
          setAnalyticsData(initialData);
          localStorage.setItem('smartguide_analytics', JSON.stringify(initialData));
        }
      } else {
        // 如果没有保存的数据，初始化数据
        const initialData = initializeAnalyticsData();
        setAnalyticsData(initialData);
        localStorage.setItem('smartguide_analytics', JSON.stringify(initialData));
      }
    };

    loadAnalyticsData();
  }, []);

  // 保存分析数据到本地存储
  useEffect(() => {
    localStorage.setItem('smartguide_analytics', JSON.stringify(analyticsData));
  }, [analyticsData]);

  // 清零分析数据
  const resetAnalyticsData = () => {
    const initialData = initializeAnalyticsData();
    setAnalyticsData(initialData);
    localStorage.setItem('smartguide_analytics', JSON.stringify(initialData));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500">Deep dive into how users interact with your products.</p>
        </div>
        <button
          onClick={resetAnalyticsData}
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
        >
          清零数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Unique Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.uniqueUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Avg. Help Time</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.avgHelpTime}s</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">CSAT Score</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.csatScore}/5</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Bypass Rate</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData.bypassRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-8">Service Type Breakdown</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.serviceTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Bar dataKey="proactive" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Self Guided" />
                <Bar dataKey="reactive" fill="#94a3b8" radius={[4, 4, 0, 0]} name="AI Chat" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-8">Issue Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.issueDistribution}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.issueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">数据分析说明</h3>
        <ul className="list-disc list-inside text-slate-600 space-y-2">
          <li>数据已清零，上线后将按照实际情况统计</li>
          <li>系统会自动记录用户交互数据</li>
          <li>数据存储在本地，确保隐私安全</li>
          <li>点击"清零数据"按钮可以重置所有分析数据</li>
        </ul>
      </div>
    </div>
  );
};

export default Analytics;
