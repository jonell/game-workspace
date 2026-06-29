import React, { useState } from 'react';
import { Tabs } from 'antd';
import { BarChartOutlined, TrophyOutlined, DollarOutlined } from '@ant-design/icons';
import DashboardPage from './DashboardPage';
import PerformancePage from './PerformancePage';
import AdminRevenuePage from './RevenuePage';

const UnifiedDashboard: React.FC = () => {
  const [tab, setTab] = useState('dashboard');

  return (
    <div>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        size="large"
        items={[
          {
            key: 'dashboard',
            label: <span>{React.createElement(BarChartOutlined)} 数据看板</span>,
            children: <DashboardPage />,
          },
          {
            key: 'performance',
            label: <span>{React.createElement(TrophyOutlined)} 绩效看板</span>,
            children: <PerformancePage />,
          },
          {
            key: 'revenue',
            label: <span>{React.createElement(DollarOutlined)} 收入流水</span>,
            children: <AdminRevenuePage />,
          },
        ]}
      />
    </div>
  );
};

export default UnifiedDashboard;
