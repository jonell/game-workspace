import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Typography, Button, message, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import http from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
const { Option } = Select;

const typeConfig: Record<string, { color: string; label: string }> = {
  NEW: { color: 'blue', label: '新单' }, RENEW: { color: 'cyan', label: '续费' },
  REPURCHASE: { color: 'purple', label: '复购' }, TIP: { color: 'orange', label: '打赏' },
};
const statusConfig: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: '待派' }, GRABBED: { color: 'blue', label: '已抢' },
  CONFIRMED: { color: 'green', label: '已确认' }, DONE: { color: 'green', label: '已完成' },
  CANCELLED: { color: 'default', label: '已取消' },
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { chatActive, chatPartner, setChatActive } = useAuthStore();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await http.get('/orders', { params });
      const list = data.data?.items ?? data.data ?? [];
      setOrders(list);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      {chatActive && (
        <div onClick={() => setChatActive(false)} style={{
          background: 'linear-gradient(135deg, #FF4757, #FF6B81)', borderRadius: 14, padding: '14px 18px',
          marginBottom: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 16px rgba(255,71,87,0.35)',
        }}>
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#FF4757',
            animation: 'pulse-glow 0.8s ease-in-out infinite', boxShadow: '0 0 16px rgba(255,255,255,0.6)' }}>
            {(chatPartner || '?')[0].toUpperCase()}
          </span>
          <div style={{ flex: 1, color: '#FFF' }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{chatPartner} 发来消息</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>💬 点击前往抢单中心查看并回复</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>接单记录</Text>
          <br /><Text type="secondary">查看我的接单历史</Text>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select placeholder="全部状态" allowClear value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')} style={{ width: 120 }}>
            {Object.entries(statusConfig).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          <Button icon={React.createElement(ReloadOutlined)} onClick={fetch} loading={loading}>刷新</Button>
        </div>
      </div>
      <Table size="small" dataSource={orders} rowKey="id" loading={loading}
        columns={[
          { title: '订单ID', dataIndex: 'id', width: 90, render: (v: string) => v?.slice(0, 8) },
          { title: '游戏', dataIndex: 'gameName', width: 100 },
          { title: '客户', key: 'wx', width: 120, render: (_: any, r: any) => r.customFields?.customerWechat || r.customer?.wechatId || '-' },
          { title: '金额', dataIndex: 'amount', width: 100, render: (v: number) => <span style={{ color: '#FF4757', fontWeight: 600 }}>¥{v?.toFixed(2)}</span> },
          { title: '类型', dataIndex: 'type', width: 70, render: (t: string) => <Tag color={typeConfig[t]?.color}>{typeConfig[t]?.label || t}</Tag> },
          { title: '接单人', key: 'companion', width: 100,
            render: (_: any, r: any) => r.companion?.user?.username ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#7B61FF', color: '#FFF',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                  {r.companion.user.username[0].toUpperCase()}
                </span>
                <Text>{r.companion.user.username}</Text>
              </span>
            ) : <Text type="secondary">-</Text>
          },
          { title: '状态', dataIndex: 'status', width: 80, render: (s: string) => <Tag color={statusConfig[s]?.color}>{statusConfig[s]?.label||s}</Tag> },
          { title: '创建时间', dataIndex: 'createdAt', width: 130, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-' },
        ]}
        pagination={{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }}
      />
    </div>
  );
};

export default OrdersPage;
