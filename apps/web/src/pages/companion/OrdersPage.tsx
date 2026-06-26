import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import http from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const typeConfig: Record<string, { color: string; label: string }> = {
  NEW: { color: 'blue', label: '新单' }, RENEW: { color: 'cyan', label: '续费' },
  REPURCHASE: { color: 'purple', label: '复购' }, TIP: { color: 'orange', label: '打赏' },
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { chatActive, chatPartner, setChatActive } = useAuthStore();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/orders');
      setOrders(data.data ?? []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      {/* 聊天通知横幅 */}
      {chatActive && (
        <div onClick={() => setChatActive(false)} style={{
          background: 'linear-gradient(135deg, #FF4757, #FF6B81)', borderRadius: 12, padding: '12px 18px',
          marginBottom: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 2px 12px rgba(255,71,87,0.3)',
        }}>
          <span style={{
            width: 38, height: 38, borderRadius: '50%', background: '#FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#FF4757',
            animation: 'pulse-glow 1s ease-in-out infinite',
            boxShadow: '0 0 12px rgba(255,255,255,0.5)',
          }}>
            {(chatPartner || '?')[0].toUpperCase()}
          </span>
          <div style={{ flex: 1, color: '#FFF' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>💬 {chatPartner} 发来消息</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>点击查看对话 · 点击此处关闭通知</div>
          </div>
          <span style={{ color: '#FFF', fontSize: 20 }}>▶</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div><Text strong style={{ fontSize: 16 }}>接单记录</Text><br /><Text type="secondary">查看所有接单历史和客户信息</Text></div>
        <Button icon={React.createElement(ReloadOutlined)} onClick={fetch} loading={loading}>刷新</Button>
      </div>
      <Table size="small" dataSource={orders} rowKey="id" loading={loading}
        columns={[
          { title: '游戏', dataIndex: 'gameName', width: 120 },
          { title: '类型', dataIndex: 'type', width: 80, render: (t: string) => <Tag color={typeConfig[t]?.color}>{typeConfig[t]?.label || t}</Tag> },
          { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => <span style={{ color: '#FF4757', fontWeight: 600 }}>¥{v?.toFixed(2)}</span> },
          { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag>{s}</Tag> },
          { title: '客户微信', key: 'wx', width: 140, render: (_: any, r: any) => (r.customFields?.customerWechat || r.customer?.wechatId || '-') },
          { title: '房间码', key: 'room', width: 100, render: (_: any, r: any) => (r.customFields?.customerRoomCode || '-') },
          { title: '时间', dataIndex: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-' },
        ]}
        pagination={{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条记录` }}
      />
    </div>
  );
};

export default OrdersPage;
