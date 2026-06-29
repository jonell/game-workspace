import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Tag, Row, Col, Spin, message, Empty, Progress, Space } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ordersApi } from '../../api/orders';

const { Text, Title } = Typography;

const PoolPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [poolStatus, setPoolStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [grabbing, setGrabbing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [poolRes, statusRes] = await Promise.all([
        ordersApi.pool(),
        ordersApi.poolStatus(),
      ]);
      setOrders(poolRes.data.data ?? []);
      setPoolStatus(statusRes.data.data);
    } catch (e) {
      console.error('Pool fetch error', e);
      message.error('加载抢单池失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGrab = async (orderId: string) => {
    setGrabbing(orderId);
    try {
      await ordersApi.grab(orderId);
      message.success('抢单成功！');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '抢单失败');
    } finally {
      setGrabbing(null);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const isUnlocked = poolStatus?.isUnlocked ?? false;
  const todayRevenue = poolStatus?.todayRevenue ?? 0;
  const threshold = poolStatus?.threshold ?? 100;
  const pct = Math.min(Math.round((todayRevenue / threshold) * 100), 100);

  return (
    <div>
      <Title level={4}>📦 抢单池</Title>

      {/* Status banner */}
      <Card size="small" style={{ marginBottom: 16, background: isUnlocked ? '#f6ffed' : '#fff7e6' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong>
              当日流水：¥{todayRevenue} ｜ 解锁门槛：¥{threshold}
              {isUnlocked ? ' ｜ 🟢 已解锁' : ' ｜ 🔒 未解锁'}
            </Text>
          </Col>
          <Col>
            <Tag color={isUnlocked ? 'success' : 'warning'} style={{ fontSize: 14, padding: '4px 12px' }}>
              {isUnlocked ? '✅ 可抢单' : `还差 ¥${Math.round((threshold - todayRevenue) * 100) / 100}`}
            </Tag>
          </Col>
        </Row>
        {!isUnlocked && <Progress percent={pct} size="small" style={{ marginTop: 8 }} />}
      </Card>

      {!isUnlocked && (
        <Card size="small" style={{ marginBottom: 16, textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: 48, color: '#faad14' }}>
            {React.createElement(ThunderboltOutlined)}
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">今日流水不足 ¥{threshold}，抢单池已锁定</Text>
            <br />
            <Text type="secondary">请先完成老客户服务提升流水</Text>
          </div>
        </Card>
      )}

      {isUnlocked && orders.length === 0 && <Empty description="暂无待抢订单" />}

      <Row gutter={[12, 12]}>
        {orders.map((order: any) => (
          <Col span={8} key={order.id}>
            <Card
              size="small"
              hoverable={isUnlocked}
              title={
                <Space>
                  <Tag color="blue">{order.customer?.customerCode ?? 'N/A'}</Tag>
                  <Text>{order.gameName}</Text>
                </Space>
              }
              extra={
                isUnlocked ? (
                  <Button
                    type="primary"
                    size="small"
                    loading={grabbing === order.id}
                    onClick={() => handleGrab(order.id)}
                  >
                    抢单
                  </Button>
                ) : (
                  <Button size="small" disabled>🔒</Button>
                )
              }
            >
              <div style={{ fontSize: 13 }}>
                <div>金额：¥{order.amount}</div>
                <div>来源：{order.customFields?.customerWechat ? '微信' : '平台'}</div>
                {order.customFields?.deltaMode && <div>模式：{order.customFields.deltaMode}</div>}
                {order.customFields?.deltaNote && (
                  <div style={{ color: '#faad14', marginTop: 4 }}>⚠️ {order.customFields.deltaNote}</div>
                )}
                <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                  {React.createElement(ClockCircleOutlined)} {new Date(order.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary">💡 抢单后可见客户联系方式和来源账号ID</Text>
      </Card>
    </div>
  );
};

export default PoolPage;
