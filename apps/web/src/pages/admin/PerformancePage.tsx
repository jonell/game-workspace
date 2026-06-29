import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Typography,
  Alert,
  DatePicker,
  Progress,
  Space,
} from 'antd';
import {
  WarningOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { dashboardApi } from '../../api/dashboard';

const { Text, Title } = Typography;

const IconWarning = React.createElement(WarningOutlined);
const IconTrophy = React.createElement(TrophyOutlined);

const PerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  const fetchDaily = useCallback(async (date?: string) => {
    setLoading(true);
    try {
      const { data } = await dashboardApi.dailyPerformance(date);
      setDailyData(data.data ?? []);
    } catch (err) {
      console.error('Daily performance fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthly = useCallback(async (month?: string) => {
    setLoading(true);
    try {
      const { data } = await dashboardApi.monthlyPerformance(month);
      setMonthlyData(data.data ?? []);
    } catch (err) {
      console.error('Monthly performance fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') fetchDaily(selectedDate.format('YYYY-MM-DD'));
    else fetchMonthly(selectedMonth.format('YYYY-MM'));
  }, [activeTab, selectedDate, selectedMonth, fetchDaily, fetchMonthly]);

  const lowPerformanceAlerts = dailyData.filter(
    (r) => r.acceptRate < 30 || r.dailyRevenue < 100,
  );

  const dailyColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1;
        if (rank === 1) return '\u{1F947}';
        if (rank === 2) return '\u{1F948}';
        if (rank === 3) return '\u{1F949}';
        return rank;
      },
    },
    {
      title: '陪玩',
      dataIndex: 'companionName',
      key: 'companionName',
      width: 120,
    },
    {
      title: '在线时长',
      dataIndex: 'onlineDuration',
      key: 'onlineDuration',
      width: 100,
    },
    {
      title: '工作时长',
      dataIndex: 'workDuration',
      key: 'workDuration',
      width: 100,
    },
    {
      title: '接单率',
      dataIndex: 'acceptRate',
      key: 'acceptRate',
      width: 90,
      render: (v: number) => (
        <span style={{ color: v < 30 ? '#FF4757' : '#52c41a', fontWeight: 600 }}>
          {v}%
        </span>
      ),
    },
    {
      title: '续费率',
      dataIndex: 'renewRate',
      key: 'renewRate',
      width: 90,
      render: (v: number) => `${v}%`,
    },
    {
      title: '复购率',
      dataIndex: 'repurchaseRate',
      key: 'repurchaseRate',
      width: 90,
      render: (v: number) => `${v}%`,
    },
    {
      title: '今日流水',
      dataIndex: 'dailyRevenue',
      key: 'dailyRevenue',
      width: 120,
      render: (v: number) => (
        <span style={{ color: '#FF4757', fontWeight: 600 }}>
          ¥{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          ONLINE: 'green',
          BUSY: 'red',
          IDLE: 'orange',
          OFFLINE: 'default',
        };
        const labelMap: Record<string, string> = {
          ONLINE: '在线',
          BUSY: '接单中',
          IDLE: '娱乐中',
          OFFLINE: '离线',
        };
        return <Tag color={colorMap[s] || 'default'}>{labelMap[s] || s}</Tag>;
      },
    },
  ];

  const monthlyColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1;
        if (rank === 1) return '\u{1F947}';
        if (rank === 2) return '\u{1F948}';
        if (rank === 3) return '\u{1F949}';
        return rank;
      },
    },
    {
      title: '陪玩',
      dataIndex: 'companionName',
      key: 'companionName',
      width: 120,
    },
    {
      title: '总订单',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 90,
    },
    {
      title: '月流水',
      dataIndex: 'monthlyRevenue',
      key: 'monthlyRevenue',
      width: 130,
      render: (v: number) => (
        <span style={{ color: '#FF4757', fontWeight: 600 }}>
          ¥{v.toLocaleString()}
        </span>
      ),
    },
    {
      title: '续费率',
      dataIndex: 'renewRate',
      key: 'renewRate',
      width: 90,
      render: (v: number) => `${v}%`,
    },
    {
      title: '复购率',
      dataIndex: 'repurchaseRate',
      key: 'repurchaseRate',
      width: 90,
      render: (v: number) => `${v}%`,
    },
  ];

  const monthlyDetailColumns = [
    {
      title: '陪玩',
      dataIndex: 'companionName',
      key: 'companionName',
      width: 120,
    },
    {
      title: '首单占比',
      dataIndex: 'firstOrderRatio',
      key: 'firstOrderRatio',
      width: 200,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={v}
            size="small"
            strokeColor="#1677ff"
            style={{ flex: 1, margin: 0 }}
          />
          <Text style={{ fontSize: 12, minWidth: 32 }}>{v}%</Text>
        </div>
      ),
    },
    {
      title: '续费占比',
      dataIndex: 'renewRatio',
      key: 'renewRatio',
      width: 200,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={v}
            size="small"
            strokeColor="#52c41a"
            style={{ flex: 1, margin: 0 }}
          />
          <Text style={{ fontSize: 12, minWidth: 32 }}>{v}%</Text>
        </div>
      ),
    },
    {
      title: '复购占比',
      dataIndex: 'repurchaseRatio',
      key: 'repurchaseRatio',
      width: 200,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={v}
            size="small"
            strokeColor="#722ed1"
            style={{ flex: 1, margin: 0 }}
          />
          <Text style={{ fontSize: 12, minWidth: 32 }}>{v}%</Text>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {IconTrophy && (
            <span style={{ fontSize: 24, color: '#FAAD14' }}>{IconTrophy}</span>
          )}
          <Title level={4} style={{ margin: 0 }}>
            陪玩绩效看板
          </Title>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'daily',
            label: '每日绩效',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text>选择日期：</Text>
                  <DatePicker
                    value={selectedDate}
                    onChange={(d) => d && setSelectedDate(d)}
                    allowClear={false}
                  />
                </Space>

                <Card
                  title={
                    <span>
                      {IconTrophy}{' 绩效排名 '}
                      <Text type="secondary">
                        {selectedDate.format('YYYY-MM-DD')}
                      </Text>
                    </span>
                  }
                  size="small"
                >
                  <Table
                    dataSource={dailyData}
                    columns={dailyColumns}
                    rowKey="companionId"
                    loading={loading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无数据' }}
                  />
                </Card>

                {lowPerformanceAlerts.length > 0 && (
                  <Card
                    title={
                      <span>
                        {IconWarning}{' 低绩效预警'}
                      </span>
                    }
                    size="small"
                    style={{ marginTop: 16 }}
                  >
                    {lowPerformanceAlerts.map((a: any) => (
                      <Alert
                        key={a.companionId}
                        message={
                          <span>
                            <Text strong>{a.companionName || a.companionId}</Text>
                            {' — '}
                            {a.acceptRate < 30 && (
                              <Text type="danger">
                                接单率 {a.acceptRate}%（低于30%）
                              </Text>
                            )}
                            {a.acceptRate < 30 && a.dailyRevenue < 100 && '，'}
                            {a.dailyRevenue < 100 && (
                              <Text type="warning">
                                今日流水 ¥{a.dailyRevenue}（低于100）
                              </Text>
                            )}
                          </span>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'monthly',
            label: '全月绩效',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text>选择月份：</Text>
                  <DatePicker
                    picker="month"
                    value={selectedMonth}
                    onChange={(d) => d && setSelectedMonth(d)}
                    allowClear={false}
                  />
                </Space>

                <Card
                  title={
                    <span>
                      {IconTrophy}{' 月度绩效排名 '}
                      <Text type="secondary">
                        {selectedMonth.format('YYYY-MM')}
                      </Text>
                    </span>
                  }
                  size="small"
                >
                  <Table
                    dataSource={monthlyData}
                    columns={monthlyColumns}
                    rowKey="companionId"
                    loading={loading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无数据' }}
                  />
                </Card>

                <Card
                  title="收入结构分解"
                  size="small"
                  style={{ marginTop: 16 }}
                >
                  <Table
                    dataSource={monthlyData}
                    columns={monthlyDetailColumns}
                    rowKey="companionId"
                    loading={loading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无数据' }}
                  />
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default PerformancePage;
