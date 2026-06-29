import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Tag, Progress, Spin, Space } from 'antd';
import { DollarOutlined, ClockCircleOutlined, ThunderboltOutlined, PlayCircleOutlined, SearchOutlined, CoffeeOutlined } from '@ant-design/icons';
import { companionsApi } from '../api/companions';
import { useAuthStore } from '../stores/authStore';

const { Text, Title } = Typography;

const IconDollar = React.createElement(DollarOutlined);
const IconClock = React.createElement(ClockCircleOutlined);
const IconThunder = React.createElement(ThunderboltOutlined);
const IconPlay = React.createElement(PlayCircleOutlined);
const IconSearch = React.createElement(SearchOutlined);
const IconCoffee = React.createElement(CoffeeOutlined);

const StatBlock: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> =
  ({ label, value, icon, color }) => (
    <Card size="small" style={{ borderLeft: `3px solid ${color}`, textAlign: 'center' }}>
      <div style={{ fontSize: 24, color, opacity: 0.5, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </Card>
  );

const CompanionPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await companionsApi.workbench();
      setData(res.data);
    } catch (e) {
      console.error('Workbench fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const switchStatus = async (status: string) => {
    try {
      await companionsApi.updateStatus(user?.companionId ?? '', status);
      fetchData();
    } catch { /* ignore */ }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <Text type="secondary">加载失败</Text>;

  const unlockPct = Math.min(Math.round((data.todayRevenue / data.unlockThreshold) * 100), 100);
  const freePct = Math.min(Math.round((data.todayRevenue / data.freeThreshold) * 100), 100);

  return (
    <div>
      <Title level={4}>👤 我的工作台</Title>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatBlock label="今日流水" value={`¥${data.todayRevenue}`} icon={IconDollar} color="#1677ff" />
        </Col>
        <Col span={6}>
          <StatBlock label="解锁门槛" value={data.isUnlocked ? '✅ 已解锁' : `¥${data.unlockThreshold}`}
            icon={IconThunder} color={data.isUnlocked ? '#52c41a' : '#faad14'} />
        </Col>
        <Col span={6}>
          <StatBlock label="娱乐计时" value={`${data.entertainmentMinutes}分钟`}
            icon={IconClock} color="#eb2f96" />
        </Col>
        <Col span={6}>
          <StatBlock label="暂扣费用" value={`¥${data.entertainmentFee}`}
            icon={IconDollar} color="#ff4d4f" />
        </Col>
      </Row>

      {/* Unlock progress */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Text>🎯 流水解锁进度：¥{data.todayRevenue} / ¥{data.unlockThreshold}</Text>
        <Progress percent={unlockPct} status={data.isUnlocked ? 'success' : 'active'} />
        <Text type="secondary">
          {data.isUnlocked
            ? '抢单池已解锁 ✅'
            : `还差 ¥${data.unlockThreshold - data.todayRevenue} 解锁抢单池`}
        </Text>
      </Card>

      {/* Free threshold */}
      <Card size="small" style={{ marginTop: 8 }}>
        <Text>🎯 免单门槛：¥{data.freeThreshold} ｜ 还差 ¥{Math.max(0, data.freeThreshold - data.todayRevenue)} 免娱乐费</Text>
        <Progress percent={freePct} status={data.todayRevenue >= data.freeThreshold ? 'success' : 'active'}
          strokeColor="#eb2f96" />
      </Card>

      {/* Status durations */}
      <Card title="📊 今日状态时长" size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {(['entertainment', 'idle', 'work', 'rest'] as const).map(mode => {
            const labels = { entertainment: '🎮娱乐', idle: '💼空闲', work: '🔴接单', rest: '🛏️休息' };
            return (
              <Col span={6} key={mode}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text type="secondary">{labels[mode]}</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {data.statusDurations?.[mode] ?? '00:00'}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Quick actions */}
      <Card size="small" style={{ marginTop: 16, textAlign: 'center' }}>
        <Space size="large">
          <Button type="default" icon={IconPlay} size="large" onClick={() => switchStatus('IDLE')}>娱乐中</Button>
          <Button type="primary" icon={IconSearch} size="large" onClick={() => switchStatus('ONLINE')}>等单中</Button>
          <Button type="default" icon={IconCoffee} size="large" onClick={() => switchStatus('OFFLINE')}>休息中</Button>
        </Space>
      </Card>

      {/* Online companions */}
      <Card title="在线陪玩" size="small" style={{ marginTop: 16 }}>
        {data.onlineCompanions?.map((c: any) => (
          <Tag key={c.id} color={c.status === 'BUSY' ? 'red' : 'green'} style={{ marginBottom: 8, padding: '4px 12px', fontSize: 14 }}>
            {c.user?.username} {c.status === 'BUSY' ? '接单中' : '等单中'}
          </Tag>
        ))}
        {(!data.onlineCompanions || data.onlineCompanions.length === 0) && <Text type="secondary">暂无在线陪玩</Text>}
      </Card>
    </div>
  );
};

export default CompanionPage;
