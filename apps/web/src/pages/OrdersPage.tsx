import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Select, DatePicker, message, Space, Badge, Modal, Upload, Tag, InputNumber, Checkbox, Divider, Input } from 'antd';
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import http from '../api/client';
import { ordersApi } from '../api/orders';
import { useAuthStore } from '../stores/authStore';
import OrderTable from '../components/OrderTable';
import { orderStatusConfig } from '../constants';

const { Text } = Typography;
const { Option } = Select;

interface SettlementForm {
  customerCode: string; firstDuration: number; firstPrice: number;
  hasRenew: boolean; renewDuration: number; renewPrice: number;
  customerType: string; gameName: string; settlementType: string;
  screenshotUrl: string; wechatId: string;
}

const OrdersPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isCompanion = user?.role === 'COMPANION';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const read = () => {
      const m: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('unread-')) m[k.replace('unread-', '')] = parseInt(localStorage.getItem(k) || '0', 10);
      }
      setUnreadMap(m);
    };
    read(); const t = setInterval(read, 3000); return () => clearInterval(t);
  }, []);

  const [settleModal, setSettleModal] = useState(false);
  const [settleOrderId, setSettleOrderId] = useState<string>('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [form, setForm] = useState<SettlementForm>({
    customerCode: '', firstDuration: 0, firstPrice: 0, hasRenew: false, renewDuration: 0, renewPrice: 0,
    customerType: '', gameName: '', settlementType: 'COMPANION', screenshotUrl: '', wechatId: '',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await http.get('/orders', { params });
      setOrders(data.data?.items ?? data.data ?? []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!form.customerCode || form.customerCode.length < 2) { setForm(prev => ({ ...prev, customerType: '' })); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await http.get('/customers', { params: { customerCode: form.customerCode } });
        const customers = data.data?.items ?? data.data ?? [];
        if (Array.isArray(customers) && customers.length > 0) {
          const customer = customers[0];
          try {
            const orderRes = await http.get('/orders', { params: { customerId: customer.id, status: 'DONE' } });
            const doneOrders = orderRes.data?.data?.items ?? orderRes.data?.data ?? [];
            const doneCount = Array.isArray(doneOrders) ? doneOrders.length : 0;
            setForm(prev => ({ ...prev, customerType: doneCount === 0 ? 'NEW' : 'REPURCHASE', gameName: prev.gameName || customer.preferredGame || '', wechatId: prev.wechatId || customer.wechatId || '' }));
          } catch { setForm(prev => ({ ...prev, customerType: 'NEW' })); }
        }
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.customerCode]);

  const firstAmount = (form.firstDuration || 0) * (form.firstPrice || 0);
  const renewAmount = form.hasRenew ? (form.renewDuration || 0) * (form.renewPrice || 0) : 0;
  const totalAmount = firstAmount + renewAmount;

  const openSettleModal = (order: any) => {
    setSettleOrderId(order.id);
    setForm({
      customerCode: order.customer?.customerCode || order.customFields?.customerCode || '',
      firstDuration: order.duration || 1, firstPrice: order.amount || 0,
      hasRenew: false, renewDuration: 0, renewPrice: 0,
      customerType: order.type === 'NEW' ? 'NEW' : order.type === 'REPURCHASE' ? 'REPURCHASE' : '',
      gameName: order.gameName || '', settlementType: 'COMPANION', screenshotUrl: '',
      wechatId: order.customFields?.customerWechat || order.customer?.wechatId || '',
    });
    setSettleModal(true);
  };

  const handleSettleSubmit = async () => {
    if (!form.firstDuration || !form.firstPrice) { message.warning('请填写首单时长和单价'); return; }
    if (!form.gameName) { message.warning('请填写游戏名称'); return; }
    setSettleLoading(true);
    try {
      await ordersApi.completeBilling(settleOrderId, {
        customerCode: form.customerCode || undefined, firstOrder: { duration: form.firstDuration, price: form.firstPrice },
        hasRenew: form.hasRenew, renewOrder: form.hasRenew ? { duration: form.renewDuration, price: form.renewPrice } : undefined,
        gameName: form.gameName, type: form.settlementType, screenshotUrl: form.screenshotUrl || undefined, wechatId: form.wechatId || undefined,
      });
      message.success('服务结算完成'); setSettleModal(false); fetch();
    } catch (e: any) { message.error(e?.response?.data?.message ?? '结算失败'); }
    finally { setSettleLoading(false); }
  };

  const handleUpload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await http.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({ ...prev, screenshotUrl: data.data?.url ?? data.url ?? '' })); message.success('上传成功');
    } catch { message.error('上传失败'); }
    return false;
  };

  // Companion-only action buttons
  const renderCompanionActions = (r: any) => (
    <>
      <Badge count={unreadMap[r.id] || 0} size="small">
        <Button size="small" onClick={() => {
          localStorage.removeItem(`unread-${r.id}`);
          setUnreadMap(prev => { const { [r.id]: _, ...rest } = prev; return rest; });
        }}>沟通</Button>
      </Badge>
      {r.status === 'GRABBED' && !r.contactStatus && (<>
        <Upload showUploadList={false} beforeUpload={async (file: File) => {
          const fd = new FormData(); fd.append('file', file);
          try { const { data } = await http.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            await http.put(`/orders/${r.id}/contact`, { contactStatus: 'added', screenshotUrl: data.data?.url || data.url || '' });
            message.success('截图已上传'); fetch();
          } catch(e:any) { message.error('上传失败'); }
          return false;
        }}><Button size="small" icon={React.createElement(UploadOutlined)}>上传截图</Button></Upload>
        <Button type="primary" size="small" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={async () => {
          try { await http.put(`/orders/${r.id}/contact`, { contactStatus: 'added' }); message.success('已标记'); fetch(); }
          catch(e:any) { message.error(e?.response?.data?.message||'操作失败'); }
        }}>联系方式添加成功</Button>
        <Button danger size="small" onClick={async () => {
          try { await http.put(`/orders/${r.id}/contact`, { contactStatus: 'not_accepted' }); message.success('已标记'); fetch(); }
          catch(e:any) { message.error(e?.response?.data?.message||'操作失败'); }
        }}>已添加未同意</Button>
      </>)}
      {r.status === 'GRABBED' && r.contactStatus === 'added' && (<>
        <Button type="primary" size="small" onClick={async () => { try { await http.post(`/orders/${r.id}/confirm`); message.success('已开始服务'); fetch(); } catch(e:any) { message.error(e?.response?.data?.message||'操作失败'); } }}>开始服务</Button>
        <Button size="small" onClick={async () => { try { await http.post(`/orders/${r.id}/republish`); message.success('已发布到抢单池'); fetch(); } catch(e:any) { message.error(e?.response?.data?.message||'发布失败'); } }}>发布到抢单池</Button>
        <Button size="small" onClick={() => { const dt = prompt('预约时间 (YYYY-MM-DD HH:mm)', ''); if (dt) http.put(`/orders/${r.id}/contact`, { scheduledAt: new Date(dt).toISOString() }).then(()=>{message.success('已预约'); fetch();}).catch((e:any)=>message.error(e?.response?.data?.message||'失败')); }}>预约时间</Button>
      </>)}
      {r.status === 'GRABBED' && r.contactStatus === 'not_accepted' && <Tag color="orange">待客户同意</Tag>}
      {r.status === 'CONFIRMED' && (<>
        <Button size="small" onClick={async () => { try { await http.post(`/orders/${r.id}/renew`); message.success('已续单'); fetch(); } catch(e:any) { message.error(e?.response?.data?.message||'续单失败'); } }}>续单</Button>
        <Button size="small" onClick={() => { const amt = prompt('修改金额', String(r.amount)); if (amt && !isNaN(+amt)) http.put(`/orders/${r.id}/amount`, { amount: +amt }).then(()=>{message.success('已改价'); fetch();}).catch((e:any)=>message.error(e?.response?.data?.message||'失败')); }}>改价</Button>
        <Button type="primary" size="small" onClick={() => openSettleModal(r)}>结束服务</Button>
      </>)}
    </>
  );

  const sorted = [...orders].sort((a: any, b: any) => {
    const aUnread = unreadMap[a.id] || 0; const bUnread = unreadMap[b.id] || 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    return new Date(b.grabbedAt || b.createdAt).getTime() - new Date(a.grabbedAt || a.createdAt).getTime();
  }).filter((o: any) => {
    if (!dateFilter) return true;
    return new Date(o.grabbedAt || o.createdAt).toDateString() === dateFilter.toDate().toDateString();
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>{isCompanion ? '接单记录' : '📋 订单管理'}</Text>
          {isCompanion && <><br /><Text type="secondary">查看我的接单历史</Text></>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select placeholder="全部状态" allowClear value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')} style={{ width: 120 }}>
            {Object.entries(orderStatusConfig).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
          </Select>
          <DatePicker placeholder="筛选日期" value={dateFilter} onChange={setDateFilter} style={{ width: 140 }} />
          <Button icon={React.createElement(ReloadOutlined)} onClick={fetch} loading={loading}>刷新</Button>
        </div>
      </div>
      <OrderTable dataSource={sorted} loading={loading} unreadMap={unreadMap}
        renderActions={isCompanion ? renderCompanionActions : undefined} />

      {isCompanion && (
        <Modal title="服务结算" open={settleModal} onOk={handleSettleSubmit}
          onCancel={() => setSettleModal(false)} okText="提交结算" cancelText="取消"
          confirmLoading={settleLoading} width={520} destroyOnClose>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div><Text strong>客户编号</Text>
              <Input placeholder="输入客户编号自动检测类型" value={form.customerCode}
                onChange={e => setForm(prev => ({ ...prev, customerCode: e.target.value }))} style={{ marginTop: 4 }} />
              {form.customerType && <Tag color={form.customerType === 'NEW' ? 'blue' : 'purple'} style={{ marginTop: 4 }}>{form.customerType === 'NEW' ? '首单客户' : '复购客户'}</Tag>}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Text strong>游戏名称</Text><Input placeholder="游戏名称" value={form.gameName} onChange={e => setForm(prev => ({ ...prev, gameName: e.target.value }))} style={{ marginTop: 4 }} /></div>
              <div style={{ flex: 1 }}><Text strong>结算类型</Text><Select value={form.settlementType} onChange={(v) => setForm(prev => ({ ...prev, settlementType: v }))} style={{ width: '100%', marginTop: 4 }}><Option value="COMPANION">陪玩</Option><Option value="ESCORT">代练</Option></Select></div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div><Text strong style={{ color: '#FF4757' }}>首单（必填）</Text>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <div style={{ flex: 1 }}><Text type="secondary">时长（小时）</Text><InputNumber style={{ width: '100%' }} min={0} step={0.5} value={form.firstDuration} onChange={v => setForm(prev => ({ ...prev, firstDuration: v ?? 0 }))} /></div>
                <div style={{ flex: 1 }}><Text type="secondary">单价（元/小时）</Text><InputNumber style={{ width: '100%' }} min={0} step={0.01} value={form.firstPrice} onChange={v => setForm(prev => ({ ...prev, firstPrice: v ?? 0 }))} /></div>
                <div style={{ flex: 1 }}><Text type="secondary">小计</Text><div style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, marginTop: 4, background: '#fafafa' }}><Text strong style={{ color: '#FF4757' }}>¥{firstAmount.toFixed(2)}</Text></div></div>
              </div>
            </div>
            <div>
              <Checkbox checked={form.hasRenew} onChange={e => setForm(prev => ({ ...prev, hasRenew: e.target.checked }))}><Text strong>是否续单？</Text></Checkbox>
              {form.hasRenew && <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}><Text type="secondary">续单时长（小时）</Text><InputNumber style={{ width: '100%' }} min={0} step={0.5} value={form.renewDuration} onChange={v => setForm(prev => ({ ...prev, renewDuration: v ?? 0 }))} /></div>
                <div style={{ flex: 1 }}><Text type="secondary">续单单价（元/小时）</Text><InputNumber style={{ width: '100%' }} min={0} step={0.01} value={form.renewPrice} onChange={v => setForm(prev => ({ ...prev, renewPrice: v ?? 0 }))} /></div>
                <div style={{ flex: 1 }}><Text type="secondary">续单小计</Text><div style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6, marginTop: 4, background: '#fafafa' }}><Text strong style={{ color: '#722ed1' }}>¥{renewAmount.toFixed(2)}</Text></div></div>
              </div>}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ background: 'linear-gradient(135deg, #f0f5ff, #e6f7ff)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>总计</Text><Text strong style={{ fontSize: 18, color: '#1677ff' }}>¥{totalAmount.toFixed(2)}</Text>
            </div>
            <div><Text strong>上传截图</Text><Upload beforeUpload={handleUpload} showUploadList={false}><Button icon={React.createElement(UploadOutlined)}>上传支付截图</Button></Upload>
              {form.screenshotUrl && <div style={{ marginTop: 8 }}><img src={form.screenshotUrl} alt="screenshot" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6 }} /></div>}
            </div>
          </Space>
        </Modal>
      )}
    </div>
  );
};

export default OrdersPage;
